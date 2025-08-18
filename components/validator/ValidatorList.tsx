import React from 'react';
import { Card, Row, Col, Badge } from 'react-bootstrap';
import { validatorI } from './interfaces';

interface ValidatorListProps {
  validators: validatorI[];
  onValidatorClick: (validator: validatorI) => void;
}

const ValidatorList: React.FC<ValidatorListProps> = ({ validators, onValidatorClick }) => {
  return (
    <div className="validator-list">
      {validators.map((validator) => (
        <Card 
          key={validator.vote_identity} 
          className="mb-3 shadow-sm hover-shadow cursor-pointer"
          onClick={() => onValidatorClick(validator)}
        >
          <Card.Body>
            <Row className="align-items-center">
              <Col md={2} className="text-center">
                {validator.image && (
                  <img 
                    src={validator.image} 
                    alt={validator.name} 
                    className="validator-logo mb-2"
                    style={{ width: '64px', height: '64px', borderRadius: '8px' }}
                  />
                )}
              </Col>
              <Col md={4}>
                <h5 className="mb-1 text-primary">{validator.name}</h5>
                <p className="text-muted mb-0 small">{validator.vote_identity.slice(0, 8)}...</p>
              </Col>
              <Col md={2}>
                <div className="text-center">
                  <h6 className="mb-1">Score</h6>
                  <Badge bg="primary" className="fs-6">
                    {validator.wiz_score?.toFixed(2) || 'N/A'}
                  </Badge>
                </div>
              </Col>
              <Col md={2}>
                <div className="text-center">
                  <h6 className="mb-1">Stake</h6>
                  <p className="mb-0 text-primary">
                    {validator.activated_stake ? 
                      `${(validator.activated_stake / 1e9).toLocaleString()} SOL` : 
                      'N/A'}
                  </p>
                </div>
              </Col>
              <Col md={2}>
                <div className="text-center">
                  <h6 className="mb-1">Status</h6>
                  <Badge 
                    bg={validator.delinquent ? 'danger' : 'success'}
                    className="fs-6"
                  >
                    {validator.delinquent ? 'Delinquent' : 'Active'}
                  </Badge>
                </div>
              </Col>
            </Row>
          </Card.Body>
        </Card>
      ))}
    </div>
  );
};

export default ValidatorList; 