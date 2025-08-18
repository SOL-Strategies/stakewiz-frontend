import React from 'react';
import { Form, InputGroup, Button, Card } from 'react-bootstrap';
import { validatorI } from './interfaces';

interface SearchFilterProps {
  onSearch: (query: string) => void;
  onFilterChange: (filters: any) => void;
  validators: validatorI[];
}

const SearchFilter: React.FC<SearchFilterProps> = ({ onSearch, onFilterChange, validators }) => {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [filters, setFilters] = React.useState({
    minStake: '',
    maxStake: '',
    minScore: '',
    maxScore: '',
    showDelinquent: false,
    showActive: true
  });

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    onSearch(query);
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    const newFilters = { ...filters, [name]: newValue };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  return (
    <Card className="h-100 shadow-sm">
      <Card.Body>
        <h5 className="mb-4">Search & Filter</h5>
        
        {/* Search */}
        <div className="mb-4">
          <InputGroup>
            <Form.Control
              type="text"
              placeholder="Search validators..."
              value={searchQuery}
              onChange={handleSearch}
              className="border-end-0"
            />
            <Button variant="outline-secondary" className="border-start-0">
              <i className="bi bi-search"></i>
            </Button>
          </InputGroup>
        </div>

        {/* Filters */}
        <div className="mb-4">
          <h6 className="mb-3">Stake Range</h6>
          <div className="d-flex gap-2 mb-2">
            <Form.Control
              type="number"
              placeholder="Min"
              name="minStake"
              value={filters.minStake}
              onChange={handleFilterChange}
            />
            <Form.Control
              type="number"
              placeholder="Max"
              name="maxStake"
              value={filters.maxStake}
              onChange={handleFilterChange}
            />
          </div>
        </div>

        <div className="mb-4">
          <h6 className="mb-3">Score Range</h6>
          <div className="d-flex gap-2 mb-2">
            <Form.Control
              type="number"
              placeholder="Min"
              name="minScore"
              value={filters.minScore}
              onChange={handleFilterChange}
            />
            <Form.Control
              type="number"
              placeholder="Max"
              name="maxScore"
              value={filters.maxScore}
              onChange={handleFilterChange}
            />
          </div>
        </div>

        <div className="mb-4">
          <h6 className="mb-3">Status</h6>
          <Form.Check
            type="checkbox"
            id="showActive"
            label="Show Active"
            name="showActive"
            checked={filters.showActive}
            onChange={handleFilterChange}
            className="mb-2"
          />
          <Form.Check
            type="checkbox"
            id="showDelinquent"
            label="Show Delinquent"
            name="showDelinquent"
            checked={filters.showDelinquent}
            onChange={handleFilterChange}
          />
        </div>
      </Card.Body>
    </Card>
  );
};

export default SearchFilter; 