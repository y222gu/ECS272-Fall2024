import React, { useEffect, useState, useRef } from 'react';
import * as d3 from 'd3';
import { useResizeObserver, useDebounceCallback } from 'usehooks-ts';
import { isEmpty } from 'lodash';

// Define types
interface DataPoint {
  educationLevel: string;
  age: number;
  income: number;
}

interface ComponentSize {
  width: number;
  height: number;
}

interface Margin {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export default function ScatterPlot() {
  const [data, setData] = useState<DataPoint[]>([]);
  const scatterRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<ComponentSize>({ width: 0, height: 0 });
  const margin: Margin = { top: 40, right: 20, bottom: 80, left: 60 };
  
  // Set up debounce callback for resizing
  const onResize = useDebounceCallback((size: ComponentSize) => setSize(size), 200);

  // Set up resize observer for the chart container
  useResizeObserver({ ref: scatterRef, onResize });

  // Data loading logic (CSV)
  useEffect(() => {
    const dataFromCSV = async () => {
      try {
        const csvData = await d3.csv('../../data/car_prices_subset.csv', (d: any) => {
          const year = d['year'] ? +d['year'] : NaN;
          const price = d['sellingprice'] ? +d['sellingprice'] : NaN;
          if (isNaN(year) || isNaN(price)) {
            return null; // Filter out invalid data
          }
          return {
// Access the education level
            age: year,
            income: price
          } as DataPoint;
        });
        const filteredData = csvData.filter(d => d !== null); // Remove null values
        setData(filteredData);
        // console.log(filteredData);  // Inspect loaded data

      } catch (error) {
        console.error('Error loading CSV:', error);
      }
    };
    
    dataFromCSV();
  }, []);

  // Chart rendering logic
  useEffect(() => {
    if (!data.length || size.width === 0 || size.height === 0) return;

    d3.select('#scatter-svg').selectAll('*').remove(); // Clear the previous chart
    initChart(); // Initialize new chart
  }, [data, size]);

  function initChart() {
    const chartContainer = d3.select('#scatter-svg');
    
    // Define scales with padding
    const xExtent = d3.extent(data, d => d.age) as [number, number];
    const yExtent = d3.extent(data, d => d.income) as [number, number];

    const xScale = d3.scaleLinear()
      .range([margin.left, size.width - margin.right])
      .domain([xExtent[0] - (xExtent[1] - xExtent[0]) * 0.1, xExtent[1] + (xExtent[1] - xExtent[0]) * 0.1]);

    const yScale = d3.scaleLinear()
      .range([size.height - margin.bottom, margin.top])
      .domain([yExtent[0] - (yExtent[1] - yExtent[0]) * 0.1, yExtent[1] + (yExtent[1] - yExtent[0]) * 0.1]);

    // Define color scale
    const colorScale = d3.scaleOrdinal(d3.schemeTableau10)
      .domain([...new Set(data.map(d => d.educationLevel))]);

    // Create axes
    chartContainer.append('g')
      .attr('transform', `translate(0, ${size.height - margin.bottom})`)
      .call(d3.axisBottom(xScale));

    chartContainer.append('g')
      .attr('transform', `translate(${margin.left}, 0)`)
      .call(d3.axisLeft(yScale));

    // Draw scatter plot
    chartContainer.selectAll('circle')
      .data(data)
      .join('circle')
      .attr('cx', d => xScale(d.age))
      .attr('cy', d => yScale(d.income))
      .attr('r', 5)
      .attr('fill', d => colorScale(d.educationLevel))
      .attr('stroke', 'black')
      .attr('opacity', 0.6); // Set opacity to see overlapping marks

    // Add title
    chartContainer.append('text')
      .attr('x', size.width / 2)
      .attr('y', margin.top / 2)
      .attr('text-anchor', 'middle')
      .text('Age vs Income by Education Level')
      .style('font-size', '2.4rem');

    // Add axis labels
    chartContainer.append('text')
      .attr('x', size.width / 2)
      .attr('y', size.height - 10)
      .attr('text-anchor', 'middle')
      .text('Age')
      .style('font-size', '1rem');

    chartContainer.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -size.height / 2 + 10)
      .attr('y', 20)
      .attr('text-anchor', 'middle')
      .text('Income')
      .style('font-size', '1rem');
  }

  return (
    <div ref={scatterRef} className='chart-container'>
      <svg id='scatter-svg' width='100%' height='100%'></svg>
    </div>
  );
}