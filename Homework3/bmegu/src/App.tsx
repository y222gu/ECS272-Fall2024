import React from 'react';
import { Grid } from '@mui/material';
import BarPlot from './components/BarPlot';
import ScatterPlot from './components/ScatterPlot';
import ParallePlot from './components/ParallelPlotCar';
import Notes from './components/Notes';
import StreamGraph from './components/Stream';
import Heatmap from './components/HeatMap';

function Layout() {
  return (
    
    <Grid container spacing={0} direction='column' id="main-container">
      <Grid container item xs={6} spacing={0} direction='row' sx={{ height: '100%' }}>
        <Grid item xs={4}>
          <BarPlot />
        </Grid>
        <Grid item xs={8}>
          <StreamGraph />
        </Grid>
      </Grid>
      <Grid container item xs={3} sm={3} md={3} lg={3}>
        <Grid item xs={12}>
          <Heatmap />
        </Grid>
      </Grid>
      <Grid item xs={3}>
      </Grid>
    </Grid>
  );
}

export default Layout;
