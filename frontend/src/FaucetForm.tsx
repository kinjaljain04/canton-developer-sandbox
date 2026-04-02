import React, { useState, FormEvent } from 'react';

interface FaucetResponse {
  message: string;
  transactionId?: string;
}

const FaucetForm: React.FC = () => {
  const [partyId, setPartyId] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    if (!partyId.trim()) {
      setError('Party ID cannot be empty.');
      setIsLoading(false);
      return;
    }

    try {
      // The faucet server is expected to be running and proxied to /api
      const response = await fetch('/api/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ partyId }),
      });

      const data: FaucetResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `Request failed with status ${response.status}`);
      }

      setSuccessMessage(data.message);
      setPartyId(''); // Clear input on success
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>Canton Developer Sandbox Faucet</h1>
        <p style={styles.subtitle}>
          Get instant testnet Canton Coins (CC) for your local sandbox participant.
        </p>
      </header>

      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.inputGroup}>
          <label htmlFor="partyId" style={styles.label}>
            Your Participant Party ID
          </label>
          <input
            id="partyId"
            type="text"
            value={partyId}
            onChange={(e) => setPartyId(e.target.value)}
            placeholder="e.g., party1::00010203...0e0f"
            style={styles.input}
            disabled={isLoading}
            aria-describedby="partyIdHelp"
          />
        </div>

        <button type="submit" style={isLoading ? { ...styles.button, ...styles.buttonDisabled } : styles.button} disabled={isLoading}>
          {isLoading ? 'Processing...' : 'Claim 1,000,000 CC'}
        </button>
      </form>

      {successMessage && (
        <div style={{ ...styles.message, ...styles.success }} role="alert">
          <strong>Success!</strong> {successMessage}
        </div>
      )}

      {error && (
        <div style={{ ...styles.message, ...styles.error }} role="alert">
          <strong>Error:</strong> {error}
        </div>
      )}

      <div style={styles.instructions} id="partyIdHelp">
        <h3>How to find your Party ID?</h3>
        <p>In the Canton console of your running sandbox, use the following command for your participant (e.g., `participant1`):</p>
        <pre style={styles.codeBlock}>
          {`participant1.parties.list().filter(_.id.to_string.startsWith("party1")).head.id.to_string`}
        </pre>
        <p>Copy the full Party ID string and paste it above.</p>
      </div>
    </div>
  );
};

// Basic inline styles for a clean, self-contained component
const styles: { [key: string]: React.CSSProperties } = {
  container: {
    maxWidth: '650px',
    margin: '50px auto',
    padding: '2rem',
    fontFamily: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`,
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.08)',
    border: '1px solid #e7eaf3',
  },
  header: {
    textAlign: 'center',
    marginBottom: '2rem',
  },
  title: {
    color: '#1d222b',
    fontSize: '2rem',
    fontWeight: 600,
    margin: '0 0 0.5rem 0',
  },
  subtitle: {
    color: '#5a6474',
    fontSize: '1.1rem',
    margin: 0,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
  },
  label: {
    marginBottom: '0.5rem',
    fontWeight: 500,
    color: '#333c4a',
  },
  input: {
    width: '100%',
    padding: '0.75rem 1rem',
    fontSize: '1rem',
    borderRadius: '6px',
    border: '1px solid #cdd5e3',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    outline: 'none',
  },
  button: {
    padding: '0.8rem 1.5rem',
    fontSize: '1rem',
    fontWeight: 600,
    color: '#fff',
    backgroundColor: '#0058ff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'background-color 0.2s, transform 0.1s',
  },
  buttonDisabled: {
    backgroundColor: '#a0b3d1',
    cursor: 'not-allowed',
  },
  message: {
    marginTop: '1.5rem',
    padding: '1rem',
    borderRadius: '6px',
    textAlign: 'center',
    fontSize: '0.95rem',
  },
  success: {
    backgroundColor: '#e6f6e6',
    color: '#0d6a0d',
    border: '1px solid #b7e3b7',
  },
  error: {
    backgroundColor: '#fdecec',
    color: '#a82c2c',
    border: '1px solid #f9c5c5',
  },
  instructions: {
    marginTop: '2rem',
    paddingTop: '1.5rem',
    borderTop: '1px solid #e7eaf3',
    color: '#495057',
  },
  codeBlock: {
    backgroundColor: '#f3f4f6',
    padding: '1rem',
    borderRadius: '6px',
    fontFamily: 'monospace',
    fontSize: '0.9rem',
    overflowX: 'auto',
    whiteSpace: 'pre-wrap',
    wordWrap: 'break-word',
    border: '1px solid #e5e7eb',
  },
};

export default FaucetForm;