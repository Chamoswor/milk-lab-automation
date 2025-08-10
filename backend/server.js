import { connectWithRetry } from './src/database.js';
import { listen } from './src/app.js';




const PORT = process.env.PORT || 3000;

(async function startServer() {
  try {
    await connectWithRetry();
    listen(PORT, () => {
      console.log('Serveren kjører på port ' + PORT);
    });
  } catch (err) {
    console.error('Feil under oppstart:', err);
    process.exit(1);
  }
})();
