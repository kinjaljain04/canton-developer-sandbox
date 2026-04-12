import React, { useState, useMemo } from 'react';
import { useStreamQueries, useParty } from '@c7/react';
import './ContractExplorer.css';

/**
 * A generic representation of a Daml contract from the ledger.
 */
interface DamlContract {
  contractId: string;
  templateId: string;
  payload: any;
  signatories: string[];
  observers: string[];
  agreementText: string;
}

/**
 * A React component that displays a detailed view of a single contract in a modal.
 */
const ContractDetailsModal: React.FC<{
  contract: DamlContract;
  onClose: () => void;
}> = ({ contract, onClose }) => {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h3>Contract Details</h3>
        <button className="close-button" onClick={onClose}>&times;</button>
        <div className="details-grid">
          <div className="detail-item">
            <strong>Contract ID:</strong>
            <span>{contract.contractId}</span>
          </div>
          <div className="detail-item">
            <strong>Template ID:</strong>
            <span>{contract.templateId}</span>
          </div>
        </div>
        <h4>Payload</h4>
        <pre>{JSON.stringify(contract.payload, null, 2)}</pre>
      </div>
    </div>
  );
};

/**
 * A React component that provides a UI to browse and query active contracts on the Canton ledger.
 * It streams all contracts visible to the current party and allows filtering by template ID.
 */
export const ContractExplorer: React.FC = () => {
  const party = useParty();
  const { contracts: contractsByTemplate, loading } = useStreamQueries<DamlContract>({});

  const [filter, setFilter] = useState('');
  const [selectedContract, setSelectedContract] = useState<DamlContract | null>(null);

  const allContracts = useMemo(() => {
    if (loading || !contractsByTemplate) return [];
    // The useStreamQueries hook with an empty query `{}` returns an object
    // where keys are template IDs and values are arrays of contracts.
    // We flatten this into a single array of all contracts.
    return Object.values(contractsByTemplate).flat();
  }, [contractsByTemplate, loading]);

  const filteredContracts = useMemo(() => {
    if (!filter) return allContracts;
    return allContracts.filter(c =>
      c.templateId.toLowerCase().includes(filter.toLowerCase())
    );
  }, [allContracts, filter]);

  if (loading && allContracts.length === 0) {
    return (
      <div className="contract-explorer">
        <h2>Active Contract Set Explorer</h2>
        <div className="loading-state">Loading active contracts...</div>
      </div>
    );
  }

  const truncateCid = (cid: string) => {
    if (cid.length < 20) return cid;
    return `${cid.substring(0, 8)}...${cid.substring(cid.length - 8)}`;
  };

  return (
    <div className="contract-explorer">
      <h2>Active Contract Set Explorer</h2>
      <p>Viewing contracts visible to party: <strong>{party}</strong></p>

      <div className="explorer-controls">
        <input
          type="text"
          placeholder="Filter by Template ID..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="filter-input"
          aria-label="Filter contracts by template ID"
        />
        <span className="contract-count">
          Showing {filteredContracts.length} of {allContracts.length} contracts
        </span>
      </div>

      <div className="contract-list-container">
        <table className="contract-table">
          <thead>
            <tr>
              <th>Template ID</th>
              <th>Contract ID</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredContracts.length > 0 ? (
              filteredContracts.map(contract => (
                <tr key={contract.contractId}>
                  <td data-label="Template ID">{contract.templateId}</td>
                  <td data-label="Contract ID" className="contract-id-cell">
                    <span className="contract-id-full">{contract.contractId}</span>
                    <span className="contract-id-short">{truncateCid(contract.contractId)}</span>
                  </td>
                  <td data-label="Actions">
                    <button onClick={() => setSelectedContract(contract)}>View Details</button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="no-contracts-row">
                  {allContracts.length === 0
                    ? "No active contracts found for this party."
                    : "No contracts match the current filter."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedContract && (
        <ContractDetailsModal
          contract={selectedContract}
          onClose={() => setSelectedContract(null)}
        />
      )}
    </div>
  );
};