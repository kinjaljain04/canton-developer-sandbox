import React from 'react';
import FaucetForm from './FaucetForm';
import './App.css'; // Assumes a global CSS file for styling

const App: React.FC = () => {
  return (
    <div className="app-container">
      <header className="app-header">
        <img src="/canton-logo.svg" alt="Canton Network Logo" className="logo" />
        <h1>Canton Developer Sandbox</h1>
        <p className="subtitle">The fastest way to start building on the Canton Network.</p>
      </header>

      <main className="main-content">
        <section id="faucet" className="card">
          <h2><span role="img" aria-label="droplet">💧</span> Testnet Faucet</h2>
          <p>
            Get instant Canton Coin (CC) for the developer testnet. No signup required.
            Just provide a party ID from your local sandbox and get funds to deploy contracts and test your application.
          </p>
          <FaucetForm />
        </section>

        <section id="sandbox-docs" className="card">
          <h2><span role="img" aria-label="rocket">🚀</span> One-Click Sandbox Setup</h2>
          <p>
            Spin up a complete local Canton environment with a single command. Includes a domain, sequencer, mediator, and two participant nodes, all pre-configured and ready for your Daml applications.
          </p>

          <div className="docs-section">
            <h3>1. Prerequisites</h3>
            <p>Ensure you have the following installed on your system:</p>
            <ul>
              <li><a href="https://docs.docker.com/get-docker/" target="_blank" rel="noopener noreferrer">Docker</a></li>
              <li><a href="https://docs.docker.com/compose/install/" target="_blank" rel="noopener noreferrer">Docker Compose</a></li>
              <li><a href="https://docs.daml.com/getting-started/installation" target="_blank" rel="noopener noreferrer">Daml SDK (version 3.1.0+)</a></li>
            </ul>
          </div>

          <div className="docs-section">
            <h3>2. Run the Sandbox</h3>
            <p>Clone the repository and start the sandbox environment. It typically takes 2-3 minutes to initialize.</p>
            <pre><code>
              git clone https://github.com/digital-asset/canton-developer-sandbox.git
              <br/>
              cd canton-developer-sandbox
              <br/>
              docker compose up -d
            </code></pre>
            <p>To view real-time logs from all services, run: <code>docker compose logs -f</code></p>
            <p>To shut down the sandbox completely, run: <code>docker compose down</code></p>
          </div>

          <div className="docs-section">
            <h3>3. Available Services</h3>
            <p>The sandbox environment exposes the following services on your localhost:</p>
            <table>
              <thead>
                <tr>
                  <th>Service</th>
                  <th>Port</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Participant 1 JSON API</td>
                  <td><code>7575</code></td>
                  <td>HTTP API for interacting with Participant 1's ledger.</td>
                </tr>
                <tr>
                  <td>Participant 2 JSON API</td>
                  <td><code>7576</code></td>
                  <td>HTTP API for interacting with Participant 2's ledger.</td>
                </tr>
                <tr>
                  <td>Canton Console</td>
                  <td><code>5012</code></td>
                  <td>Interactive console for managing the Canton domain.</td>
                </tr>
                 <tr>
                  <td>Canton Health Dump</td>
                  <td><code>5013</code></td>
                  <td>Canton domain health status endpoint.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="docs-section">
            <h3>4. Next Steps: Deploy and Interact</h3>
            <p>
              Once the sandbox is running, you can build your Daml model (.dar file) and deploy it to the participants using the Canton Console.
            </p>
            <h4>Generate a DAR file</h4>
            <pre><code>
              # In your Daml project directory
              <br />
              daml build
            </code></pre>
            <h4>Connect to the Canton Console</h4>
            <pre><code>
              docker compose exec canton canton-console
            </code></pre>
            <h4>Deploy to Participants</h4>
            <p>Inside the Canton Console, run the following commands:</p>
            <pre><code>
              participant1.dars.upload("/var/daml/your-project.dar")
              <br />
              participant2.dars.upload("/var/daml/your-project.dar")
            </code></pre>
            <p>
              Note: The `docker-compose.yml` file maps your local `./daml` directory to `/var/daml` inside the container, so place your `.dar` file there. After deploying, you can use the faucet above to allocate parties and start testing your application via the JSON API.
            </p>
          </div>
        </section>
      </main>

      <footer className="app-footer">
        <p>
          Built for the Canton community. Found an issue? <a href="https://github.com/digital-asset/canton-developer-sandbox/issues" target="_blank" rel="noopener noreferrer">Open an issue on GitHub</a>.
        </p>
      </footer>
    </div>
  );
};

export default App;