import express from 'express';
import cors from 'cors';
import apiRouter from './api/router.js';

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());

app.use(express.json({ limit: '200mb' }));
app.use(express.json());
app.use('/api', apiRouter);

app.get('/', (req, res) => {
  res.send('Hello from the backend server!');
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
}); 