import React, { useEffect, useState, useRef } from 'react';
import * as d3 from 'd3';
import { useResizeObserver, useDebounceCallback } from 'usehooks-ts';
import { isEmpty } from 'lodash';

interface DataPoint {
  'transmission': string;
  'condition': number;
  'odometer': number;
  'sellingprice': number;
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

export default function ParallelPlot() {
  const [data, setData] = useState<DataPoint[]>([]);
  const plotRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<ComponentSize>({ width: 0, height:0 });

  const onResize = useDebounceCallback((size: ComponentSize) => setSize(size), 200);
  useResizeObserver({ ref: plotRef, onResize });

  useEffect(() => {
    const dataFromCSV = async () => {
      try {
        const csvData = await d3.csv('../../data/car_prices_subset.csv', (d: any) => {
          const parsedData: DataPoint = {
            'transmission': d['transmission'] || '',
            'condition': d['condition'] ? +d['condition'] : NaN,
            'odometer': d['odometer'] ? +d['odometer'] : NaN,
            'sellingprice': d['sellingprice'] ? +d['sellingprice'] : NaN,
          };

          return parsedData;
        });

        const filteredData = csvData.filter(d =>
          d['transmission'] &&  // Ensure 'Risk Rating' is present (not an empty string)
          !isNaN(d['condition']) &&
          !isNaN(d['odometer']) &&
          !isNaN(d['sellingprice'])
        );

        // filter out the transmission type that is not automatic or manual
        const validTransmissionTypes = ['automatic', 'manual'];
        const filteredTransmissionData = filteredData.filter(d => validTransmissionTypes.includes(d['transmission']));

        setData(filteredTransmissionData);
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

const MARGIN = { top: 40, right: 20, bottom: 80, left: 60 };  // Increased right margin

function initChart() {
  const svg = d3.select('#parallel-svg')
    .attr('width', size.width + MARGIN.left + MARGIN.right)
    .attr('height', size.height + MARGIN.top + MARGIN.bottom)
    .append('g')
    .attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);

  // Define the dimensions for the parallel plot
  const dimensions = ['transmission' ,'condition','odometer','sellingprice'];

  const scales: { [key: string]: d3.ScalePoint<string> | d3.ScaleLinear<number, number> } = {};

  // Define scales for the first two categorical dimensions with string values
  dimensions.slice(0, 2).forEach((dim) => {
    scales[dim] = d3.scalePoint()
      .domain(data.map(d => d[dim as keyof DataPoint] as string)
        .sort((a, b) => {
          const numA = parseFloat(a);
          const numB = parseFloat(b);
          if (!isNaN(numA) && !isNaN(numB)) {
            return numB - numA;
          }
          return b.localeCompare(a);
        }))
      .range([0, size.height - MARGIN.bottom]);
  });

  // Define scales for the remaining numerical dimensions
  dimensions.slice(2).forEach((dim) => {
    scales[dim] = d3.scaleLinear()
      .domain(d3.extent(data, d => d[dim as keyof DataPoint] as number).sort((a, b) => (b ?? 0) - (a ?? 0)) as [number, number])
      .range([0, size.height - MARGIN.bottom]);
  });

  // Color Scale for 'transmission'
  const colorScale = d3.scaleOrdinal<string>()
    .domain(['automatic', 'manual'])
    .range(['#ff7f0e', '#1f77b4']);

  // Add axes for each dimension
  dimensions.forEach((dim, i) => {
    const axis = d3.axisLeft(scales[dim] as d3.AxisScale<d3.AxisDomain>);
    svg.append('g')
      .attr('transform', `translate(${i * (size.width / (dimensions.length-1))*0.9}, 0)`)
      .call(axis);
  });

  // Generate lines
  svg.selectAll('path')
    .data(data)
    .enter().append('path')
    .attr('d', (d) => {
      const points: [number, number][] = dimensions.map((dim, i) => [
        i * (size.width / (dimensions.length-1))*0.9,  // Adjusted X position calculation
        scales[dim](d[dim as keyof DataPoint] as any) ?? 0
      ]);

      return d3.line<[number, number]>()
        .x((d) => d[0])
        .y((d) => d[1])
        (points);
    })
    .attr('stroke', d => colorScale(d['transmission'].toString()))
    .attr('fill', 'none')
    .attr('stroke-width', 1.5);

  svg.selectAll('path')
    .filter((d: DataPoint) => d['transmission'] === 'manual')
    .attr('stroke-width', 1.5)
    .attr('opacity', 0.4);

  svg.selectAll('path')
    .filter((d: DataPoint) => d['transmission'] === 'automatic')
    .attr('stroke-width', 1)
    .attr('opacity', 0.15);

  svg.selectAll('.axis-label')
  .data(dimensions)
  .enter()
  .append('text')
  .attr('class', 'axis-label')
  .attr('x', (d, i) => i * (size.width / (dimensions.length-1))*0.9) // Adjust x position based on your axis spacing
  .attr('y', +450) // Adjust y position to place the labels above the axes
  .attr('text-anchor', 'middle')
  .text(d => d);

  // add a title
  svg.append('text')
  .attr('x', size.width / 2)
  .attr('y', -15)
  .attr('text-anchor', 'middle')
  .style('font-size', '2rem')
  .text('Parallel Plot of Manual and Automatic Transmission Cars');

  // Add a legend
  const legendData = [
    { color: '#ff7f0e', label: 'Automatic' },
    { color: '#1f77b4', label: 'Manual' }
  ];

    const legend = svg.append('g')
      .attr('transform', `translate(${MARGIN.left -20}, ${MARGIN.top + 130})`);

    legend.selectAll('.legend-item')
      .data(legendData)
      .enter()
      .append('g')
      .attr('class', 'legend-item')
      .attr('transform', (d, i) => `translate(0, ${i * 20})`)
      .each(function(d) {
        const legendItem = d3.select(this);
        legendItem.append('rect')
          .attr('x', 0)
          .attr('y', 0)
          .attr('width', 18)
          .attr('height', 18)
          .style('fill', d.color);

        legendItem.append('text')
          .attr('x', 24)
          .attr('y', 9)
          .attr('dy', '0.35em')
          .text(d.label)
          .style('font-size', '1rem');
      });
}

  return (
    <div ref={plotRef} className='chart-container'>
      <svg id='parallel-svg' width='100%' height='100%'></svg>
    </div>
  );
}