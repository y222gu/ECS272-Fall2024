// Header.tsx
import React from 'react';
import { AppBar, Toolbar, Typography, Box } from '@mui/material';
import './header_style.css';

const Header: React.FC = () => {
  return (
    <AppBar position="static" color="primary" className="header">
      <Toolbar>
        <Box display="flex" flexDirection="column" alignItems="center" width="100%">
          <Typography variant="h4" className="header-title">
          Used Car Market Analyzer
          </Typography>
          <Typography variant="subtitle1" className="header-subtitle">
          This dashboard is designed to help used car dealers analyze the market trends.
          </Typography>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
