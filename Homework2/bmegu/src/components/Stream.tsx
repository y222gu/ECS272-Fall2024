import React, { useEffect, useState, useRef } from 'react';
import * as d3 from 'd3';
import { useResizeObserver, useDebounceCallback } from 'usehooks-ts';

interface CarData {
  year: number;
  transmission: string; 
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

export default function StreamGraph() {
  const [data, setData] = useState<CarData[]>([]);
  const streamRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<ComponentSize>({ width: 0, height: 0 });
  const margin: Margin = { top: 40, right: 20, bottom: 80, left: 60 };

  const onResize = useDebounceCallback((size: ComponentSize) => setSize(size), 200);

  useResizeObserver({ ref: streamRef, onResize });

  // Load CSV Data
  useEffect(() => {
    const loadData = async () => {
      try {
        const csvData = await d3.csv('../../data/car_prices_subset.csv', (d: any) => {
          const year = d['year'] ? +d['year'] : NaN;
          const transmission = d['transmission'] || '';
          if (isNaN(year) || !transmission) return null;
          return { year, transmission } as CarData;
        });
        const filteredData = csvData.filter(d => d !== null); // Remove invalid rows
        setData(filteredData);
      } catch (error) {
        console.error('Error loading CSV:', error);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    if (!data.length || size.width === 0 || size.height === 0) return;

    d3.select('#stream-svg').selectAll('*').remove();
    initChart();
  }, [data, size]);

  function initChart() {
    const chartContainer = d3.select('#stream-svg');

    const groupedData = d3.groups(data, d => d.year, d => d.transmission)
      .map(([year, transmissionData]) => {
        const counts: { year: number; manual: number; automatic: number } = { year: +year, manual: 0, automatic: 0 };
        transmissionData.forEach(([transmission, cars]) => {
          counts[transmission as 'manual' | 'automatic'] = cars.length; 
        });
        return counts;
      });

    const stack = d3.stack()
      .keys(['manual', 'automatic'])
      .value((d, key) => d[key])
      (groupedData);

    const xScale = d3.scaleLinear()
      .domain(d3.extent(data, d => d.year) as [number, number])
      .range([margin.left, size.width - margin.right]);

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(stack, d => d3.max(d, d => d[1])) as number])
      .range([size.height - margin.bottom, margin.top]);

    const colorScale = d3.scaleOrdinal()
      .domain(['manual', 'automatic'])
      .range(['#1f77b4', '#ff7f0e']); 


    const area = d3.area<any>()
      .x(d => xScale(d.data.year))
      .y0(d => yScale(d[0]))
      .y1(d => yScale(d[1]))
      .curve(d3.curveBasis); // Smooth the curves

    chartContainer.selectAll('path')
      .data(stack)
      .join('path')
      .attr('d', area)
      .attr('fill', d => colorScale(d.key))
      .attr('stroke', 'black')
      .attr('opacity', 0.7);

    chartContainer.append('g')
      .attr('transform', `translate(0, ${size.height - margin.bottom})`)
      .call(d3.axisBottom(xScale).tickFormat(d3.format('d')));

    chartContainer.append('g')
      .attr('transform', `translate(${margin.left}, 0)`)
      .call(d3.axisLeft(yScale));

    chartContainer.append('text')
      .attr('x', size.width / 2)
      .attr('y', margin.top / 2 +5)
      .attr('text-anchor', 'middle')
      .text('Number of Cars Sold by Transmission Type and Model Year')
      .style('font-size', '2rem');

    // Define legend data
    const legendData = [
        { color: '#ff7f0e', label: 'Automatic' },
        { color: '#1f77b4', label: 'Manual' }
      ];
  
      // Append legend group
      const legend = chartContainer.append('g')
        .attr('transform', `translate(${margin.left + 20}, ${margin.top + 20})`);
  
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

    chartContainer.append('text')
      .attr('x', size.width / 2)
      .attr('y', size.height - 20)
      .attr('text-anchor', 'middle')
      .text('Model Year')
      .style('font-size', '1rem');

    chartContainer.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -size.height / 2 + 10)
      .attr('y', 20)
      .attr('text-anchor', 'middle')
      .text('Number of Cars Sold')
      .style('font-size', '1rem');
  }

  return (
    <div ref={streamRef} className='chart-container'>
      <svg id='stream-svg' width='100%' height='100%'></svg>
    </div>
  );
}
