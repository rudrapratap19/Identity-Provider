import { app } from './app';

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Enterprise Identity Provider running on http://localhost:${port}`);
});
