// app.tsx
import React, { useState } from 'react';
import { Grid } from '@mui/material';
import Header from './components/header'; // Import the Header
import BarPlot from './components/BarPlot';
import ScatterPlot from './components/ScatterPlot';
import ParallelPlot from './components/ParallelPlotCar';
import Notes from './components/Notes';
import StreamGraph from './components/Stream';
import Heatmap from './components/HeatMap';
import './style.css';

function Layout() {
  const [selectedColor, setSelectedColor] = useState<string | null>(null);

  const handleColorSelect = (color: string | null) => {
    setSelectedColor(color);
  };

  return (
    <>
      <Header />  {/* Add the Header component */}
      <Grid container spacing={2} direction="column" id="main-container">
        <Grid container item xs={12} direction="row">
          <Grid item xs={4} className="bar-plot grid-one">
            <BarPlot onColorSelect={handleColorSelect} />
          </Grid>
          <Grid item xs={8} className="heatmap grid-one">
            <Heatmap selectedColor={selectedColor} />
          </Grid>
        </Grid>
        <Grid container item xs={3}>
          <Grid item xs={12} className="grid-item stream-graph">
            <StreamGraph />
          </Grid>
        </Grid>
      </Grid>
    </>
  );
}

export default Layout;
