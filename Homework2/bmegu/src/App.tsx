import React from 'react';
import { Grid } from '@mui/material';
import BarPlot from './components/BarPlot';
import ScatterPlot from './components/ScatterPlot';
import ParallePlot from './components/ParallelPlotCar';
import Notes from './components/Notes';
import StreamGraph from './components/Stream';
// import SankeyPlot from './components/Sankey';
// import { CountProvider } from './context/CountContext';
// import NotesWithReducer from './components/NotesWithReducer';

function Layout() {
  return (
    <Grid container spacing={4} direction='column' id="main-container">
      <Grid container item xs={6} sm={6} md={6} lg={6}>
        <Grid item xs={12}>
          <BarPlot />
        </Grid>
      </Grid>
      <Grid container item xs={6} sm={6} md={6} lg={6}>
        <Grid item xs={12}>
          <StreamGraph />
        </Grid>
      </Grid>
      <Grid container item xs={6} sm={6} md={6} lg={6}>
        <Grid item xs={12}>
          <ParallePlot />
        </Grid>
      </Grid>
      <Grid item xs={12}>
        {/* <Notes msg={"This is a message sent from App.tsx as component prop"} />
        { // Uncomment the following to see how state management works in React.
          /*
          <CountProvider>
            <NotesWithReducer msg={"This is a message sent from App.tsx as component prop"} />
          </CountProvider>*/
        }
      </Grid>
    </Grid>
  );
}

export default Layout;