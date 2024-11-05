import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import 'd3-scale-chromatic';
import { useDebounceCallback } from 'usehooks-ts';
import { useResizeObserver } from 'usehooks-ts';

interface ComponentSize {
  width: number;
  height: number;
}

const Heatmap: React.FC<{ selectedColor: string | null }> = ({ selectedColor }) => {
  const svgRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<{ make: string; body: string; value: number }[]>([]);
  const [fullData, setFullData] = useState<any[]>([]); // Stores the complete data from CSV
  const [size, setSize] = useState<ComponentSize>({ width: 0, height: 0 });

  const onResize = useDebounceCallback((size: ComponentSize) => setSize(size), 200);
  useResizeObserver({ ref: svgRef, onResize });

  // Load all data initially
  useEffect(() => {
    d3.csv('../../data/car_prices_subset.csv').then((csvData) => {
      if (!csvData) {
        console.error("Data could not be loaded or is empty");
        return;
      }
      setFullData(csvData); // Store the full dataset
    });
  }, []);

  useEffect(() => {
    // Define all possible groups and variables from the full dataset
    const allGroups = Array.from(new Set(fullData.map((d) => d.make)));
    const allVariables = Array.from(new Set(fullData.map((d) => d.body)));

    // Filter data by selected color if provided
    const filteredData = selectedColor
      ? fullData.filter((d) => d.color === selectedColor)
      : fullData;

    // Calculate counts
    const counts = d3.rollup(
      filteredData,
      (v) => v.length,
      (d) => d.make,
      (d) => d.body
    );

    // Generate heatmap data with all combinations of make and body
    const heatmapData = allGroups.flatMap((make) =>
      allVariables.map((body) => ({
        make,
        body,
        value: counts.get(make)?.get(body) || 0 // Fill missing combinations with 0
      }))
    );

    setData(heatmapData);
  }, [selectedColor, fullData]);

  useEffect(() => {
    if (data.length === 0 || size.width === 0 || size.height === 0) return;

    const margin = { top: 80, right: 25, bottom: 70, left: 90 };
    const width = size.width - margin.left - margin.right;
    const height = size.height - margin.top - margin.bottom;

    d3.select('#heatmap svg').remove();

    const svg = d3.select('#heatmap')
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Fixed x and y axis domains based on all groups and variables
    const groups = Array.from(new Set(fullData.map((d) => d.make)));
    const variables = Array.from(new Set(fullData.map((d) => d.body)));

    const x = d3.scaleBand().range([0, width]).domain(groups);
    const y = d3.scaleBand().range([height, 0]).domain(variables);
    const maxCount = d3.max(data, (d) => d.value) ?? 1;

    // Define color scale based on maxCount
    const colorScale = selectedColor
      ? d3.scaleSequential(d3.interpolateRgb("white", ["white", "black", "silver"].includes(selectedColor) ? "black" : selectedColor)).domain([0, maxCount])
      : d3.scaleSequential(d3.interpolateCividis).domain([0, maxCount/5]);

    // Tooltip setup
    const tooltip = d3.select('#heatmap')
      .append('div')
      .style('opacity', 0)
      .attr('class', 'tooltip')
      .style('background-color', 'white')
      .style('border', 'solid')
      .style('border-width', '2px')
      .style('border-radius', '5px')
      .style('padding', '5px')
      .style('position', 'absolute');

    const mouseover = function (this: SVGRectElement) {
      tooltip.style('opacity', 1);
      d3.select(this).style('stroke', 'black').style('opacity', 1);
    };
    const mousemove = function (event: MouseEvent, d: { make: string; body: string; value: number }) {
      tooltip
        .html(`Count: ${d.value}`)
        .style('left', `${event.pageX + 10}px`)
        .style('top', `${event.pageY}px`);
    };
    const mouseleave = function (this: SVGRectElement) {
      tooltip.style('opacity', 0);
      d3.select(this).style('stroke', 'none').style('opacity', 0.8);
    };

    // Render x and y axes
    svg.append('g')
      .style('font-size', 14)
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x).tickSize(0))
      .selectAll('text')
      .style('text-anchor', 'end')
      .attr('dx', '-0.8em')
      .attr('dy', '0.15em')
      .attr('transform', 'rotate(-45)');

    svg.append('g')
      .style('font-size', 14)
      .call(d3.axisLeft(y).tickSize(0))
      .select('.domain').remove();

    const squareSize = Math.min(x.bandwidth(), y.bandwidth());

    // Render heatmap rectangles
    svg.append('g')
      .selectAll('rect')
      .data(data)
      .enter()
      .append('rect')
      .attr('x', (d) => x(d.make)! + (x.bandwidth() - squareSize) / 2)
      .attr('y', (d) => y(d.body)! + (y.bandwidth() - squareSize) / 2)
      .attr('width', squareSize)
      .attr('height', squareSize)
      .attr('rx', 2)
      .attr('ry', 2)
      .style('fill', (d) => colorScale(d.value))
      .style('stroke-width', 4)
      .style('stroke', 'none')
      .style('opacity', 0.8)
      .on('mouseover', mouseover)
      .on('mousemove', mousemove)
      .on('mouseleave', mouseleave);

    // Title and subtitle for heatmap
    svg.append('text')
      .attr('x', 0)
      .attr('y', -50)
      .attr('text-anchor', 'left')
      .style('font-size', '22px')
      .text(`Car Body Type by Make Heatmap For ${selectedColor ?? "All"} Cars`);

    svg.append('text')
      .attr('x', 0)
      .attr('y', -20)
      .attr('text-anchor', 'left')
      .style('font-size', '14px')
      .style('fill', 'grey')
      .text('Mouse over the squares to see the count');
  }, [data, size]);

  return (
    <div ref={svgRef} style={{ width: '100%', height: '100vh', maxHeight: "500px" }}>
      <div id="heatmap"></div>
    </div>
  );
};

export default Heatmap;
