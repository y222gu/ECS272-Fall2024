import React, { useEffect, useState, useRef } from 'react';
import * as d3 from 'd3';
import { useResizeObserver, useDebounceCallback } from 'usehooks-ts';
import { isEmpty } from 'lodash';

interface DataPoint {
  'Education Level': string;
  'Risk Rating': string;
  'Loan Amount': number;
  'Credit Score': number;
  'Income': number;
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

const MARGIN = { top: 40, right: 20, bottom: 80, left: 60 };

export default function ParallelPlot() {
  const [data, setData] = useState<DataPoint[]>([]);
  const plotRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<ComponentSize>({ width: 0, height: 0 });

  const onResize = useDebounceCallback((size: ComponentSize) => setSize(size), 200);
  useResizeObserver({ ref: plotRef, onResize });

  useEffect(() => {
    const dataFromCSV = async () => {
      try {
        const csvData = await d3.csv('../../data/financial_risk_assessment.csv', (d: any) => {
          const parsedData: DataPoint = {
            'Education Level': d['Education Level'] || '',
            'Risk Rating': d['Risk Rating'] || '',
            'Loan Amount': d['Loan Amount'] ? +d['Loan Amount'] : NaN,
            'Credit Score': d['Credit Score'] ? +d['Credit Score'] : NaN,
            'Income': d['Income'] ? +d['Income'] : NaN,
          };

          return parsedData;
        });

        const filteredData = csvData.filter(d =>
          d['Education Level'] && 
          d['Risk Rating'] &&  // Ensure 'Risk Rating' is present (not an empty string)
          !isNaN(d['Loan Amount']) &&
          !isNaN(d['Credit Score']) &&
          !isNaN(d['Income'])
        );

        // bin the values of 'Loan Amount', 'Credit Score' and 'Income' into 10 bins, and replace the value with the number from 1 - 10
        const bin = (data: DataPoint[], key: 'Loan Amount' | 'Credit Score' | 'Income') => {
          const values = data.map(d => d[key] as number);
          const scale = d3.scaleQuantile().domain(values).range(d3.range(20));
          data.forEach(d => d[key] = scale(d[key] as number) as unknown as number);
        };

        console.log("Before binning:", filteredData);
        bin(filteredData, 'Loan Amount');
        bin(filteredData, 'Credit Score');
        bin(filteredData, 'Income');

        console.log("After binning:", filteredData);

        setData(filteredData);
      } catch (error) {
        console.error('Error loading CSV:', error);
      }
    };

    dataFromCSV();
  }, []);

  // Render chart
  useEffect(() => {
    if (isEmpty(data) || size.width === 0 || size.height === 0) return;
  
    // Clear previous chart
    d3.select('#parallel-svg').selectAll('*').remove();
    initChart();
  }, [data, size]);

  function initChart() {
    const svg = d3.select('#parallel-svg')
    .attr('width', size.width + MARGIN.left + MARGIN.right)
    .attr('height', size.height + MARGIN.top + MARGIN.bottom)
    .append('g')
    .attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);

    console.log("SVG size:", size); 
    console.log("SVG:", svg);
  // Define the dimensions for the parallel plot
  const dimensions = ['Education Level', 'Risk Rating', 'Income', 'Credit Score', 'Loan Amount'];

  // Define scales for the first two dimensions with string values, then linear scales for the rest
  const scales: { [key: string]: d3.ScalePoint<string> | d3.ScaleLinear<number, number> } = {};

  // Define scales for the first two categorical dimensions with string values
  dimensions.slice(0, 2).forEach((dim) => {
    scales[dim] = d3.scalePoint()
      .domain(data.map(d => d[dim as keyof DataPoint] as string))
      .range([size.height - MARGIN.bottom, 0]);
  });

  // Define scales for the remaining numerical dimensions
  dimensions.slice(2).forEach((dim) => {
    scales[dim] = d3.scaleLinear()
      .domain(d3.extent(data, d => d[dim as keyof DataPoint] as number) as [number, number])
      .range([0, size.height - MARGIN.bottom]);
  });


  // Color Scale for 'Risk Rating'
  const colorScale = d3.scaleOrdinal<string>()
  .domain(['PhD', "Master's", "Bachelor's", 'High School']) 
  // dark red to light red
  .range(['#8B0000', '#FF6347', '#FFA07A', '#FFDAB9']);

    // Add axes for each dimension
    dimensions.forEach((dim, i) => {
      const axis = d3.axisLeft(scales[dim] as d3.AxisScale<d3.AxisDomain>);
      svg.append('g')
        .attr('transform', `translate(${i * (size.width / (dimensions.length - 1))}, 0)`)
        .call(axis);

      svg.append('text')
        .style('text-anchor', 'middle')
        .attr('transform', `translate(${i * (size.width / (dimensions.length - 1))}, ${size.height + MARGIN.bottom / 2})`)
        .text(dim);
    });

    // Generate lines
    svg.selectAll('path')
    .data(data)
    .enter().append('path')
    .attr('d', (d) => {
      const points: [number, number][] = dimensions.map((dim, i) => [
        i * (size.width / (dimensions.length - 1)),  // X position based on the axis
        scales[dim](d[dim as keyof DataPoint] as any) ?? 0  // Ensure value is cast to the correct type and provide default value
      ]);

      return d3.line<[number, number]>()
        .x((d) => d[0])
        .y((d) => d[1])
        (points);
    })
    .attr('stroke', d => colorScale(d['Education Level'].toString()))   // Color based on 'Risk Rating'
    .attr('fill', 'none');
  }

  return (
    <div ref={plotRef} className='chart-container' style={{ width: '90%', height: '500px' }}>
      <svg id='parallel-svg'></svg>
    </div>
  );
}