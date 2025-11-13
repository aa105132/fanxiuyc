const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');

const app = express();
const DATA_DIR = path.join(__dirname, 'data');

app.use(cors());
app.use(express.json({ limit: '300mb' }));

fs.mkdir(DATA_DIR, { recursive: true }).catch(console.error);

app.get('/api/list', async (req, res) => {
    try {
        const files = await fs.readdir(DATA_DIR);
        const archives = files
            .filter(file => file.endsWith('.json'))
            .map(file => path.basename(file, '.json'));
        res.json({ success: true, archives });
    } catch (error) {
        console.error('Error listing archives:', error);
        res.status(500).json({ success: false, error: 'Failed to list archives' });
    }
});

app.get('/api/load', async (req, res) => {
    const { archiveName } = req.query;
    if (!archiveName) {
        return res.status(400).json({ success: false, error: 'Archive name is required' });
    }
    const safeArchiveName = archiveName.replace(/[^\p{L}\p{N}_\-]/gu, '');
    const filePath = path.join(DATA_DIR, `${safeArchiveName}.json`);

    try {
        const data = await fs.readFile(filePath, 'utf8');
        res.json({ success: true, data: JSON.parse(data) });
    } catch (error) {
        if (error.code === 'ENOENT') {
            res.status(404).json({ success: false, error: 'Archive not found' });
        } else {
            console.error(`Error loading archive ${safeArchiveName}:`, error);
            res.status(500).json({ success: false, error: 'Failed to load archive' });
        }
    }
});

app.post('/api/save', async (req, res) => {
    const { archiveName: archiveNameFromRequest, data } = req.body;
    
    if (!data) {
        return res.status(400).json({ success: false, error: 'Data is required for saving' });
    }

    const finalArchiveName = archiveNameFromRequest || (data ? data._internalName : undefined);

    if (!finalArchiveName) {
        return res.status(400).json({ success: false, error: 'Archive name is required and could not be determined from data' });
    }

    const safeArchiveName = finalArchiveName.replace(/[^\p{L}\p{N}_\-]/gu, '');
    const filePath = path.join(DATA_DIR, `${safeArchiveName}.json`);

    try {
        await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
        res.json({ success: true, message: 'Archive saved successfully' });
    } catch (error) {
        console.error(`Error saving archive ${safeArchiveName}:`, error);
        res.status(500).json({ success: false, error: 'Failed to save archive' });
    }
});

app.delete('/api/delete', async (req, res) => {
    const { archiveName } = req.query;
    if (!archiveName) {
        return res.status(400).json({ success: false, error: 'Archive name is required' });
    }

    const safeArchiveName = archiveName.replace(/[^\p{L}\p{N}_\-]/gu, '');
    const filePath = path.join(DATA_DIR, `${safeArchiveName}.json`);

    try {
        await fs.unlink(filePath);
        res.json({ success: true, message: 'Archive deleted successfully' });
    } catch (error) {
        if (error.code === 'ENOENT') {
            res.status(404).json({ success: false, error: 'Archive not found' });
        } else {
            console.error(`Error deleting archive ${safeArchiveName}:`, error);
            res.status(500).json({ success: false, error: 'Failed to delete archive' });
        }
    }
});

app.listen(process.env.PORT || 3000, () => {
    console.log(`Server is running on port ${process.env.PORT || 3000}`);
});

