import React, { useState } from 'react';
import { Grid } from '@mui/material';
import BarPlot from './components/BarPlot';
import ScatterPlot from './components/ScatterPlot';
import ParallelPlot from './components/ParallelPlotCar';
import Notes from './components/Notes';
import StreamGraph from './components/Stream';
import Heatmap from './components/HeatMap';
import './style.css';

function Layout() {
  // State to hold the selected color from BarPlot
  const [selectedColor, setSelectedColor] = useState<string | null>(null);

  // Handler function to update selected color
  const handleColorSelect = (color: string | null) => {
    setSelectedColor(color);
  };

  return (
    <Grid container spacing={0} direction='column' id="main-container">
      <Grid container item xs={6} spacing={0} direction='row' sx={{ height: '100%' }}>
        <Grid item xs={4}>
          {/* Pass handleColorSelect to BarPlot as a prop */}
          <BarPlot onColorSelect={handleColorSelect} />
        </Grid>
        <Grid item xs={8}>
          <Heatmap selectedColor={selectedColor} />
        </Grid>
      </Grid>
      <Grid container item xs={3} sm={3} md={3} lg={3}>
        <Grid item xs={12} className="grid-item stream-graph">
          {/* Pass selectedColor as a prop to Heatmap */}
          <StreamGraph />
        </Grid>
      </Grid>
      <Grid item xs={3}>
        {/* Add other components like Notes, ScatterPlot, etc., here if needed */}
      </Grid>
    </Grid>
  );
}

export default Layout;
