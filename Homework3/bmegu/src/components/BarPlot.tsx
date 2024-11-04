import React, { useEffect, useState, useRef } from 'react';
import * as d3 from 'd3';
import { useResizeObserver, useDebounceCallback } from 'usehooks-ts';
import { isEmpty } from 'lodash';

// Define types
interface CategoricalBar {
  category: string;
  value: number;
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

export default function BarPlot() {
  const [bars, setBars] = useState<CategoricalBar[]>([]);
  const barRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<ComponentSize>({ width: 0, height: 0 });
  const margin: Margin = { top: 40, right: 20, bottom: 80, left: 60 };

  const onResize = useDebounceCallback((size: ComponentSize) => setSize(size), 200);

  useResizeObserver({ ref: barRef, onResize });

  useEffect(() => {
    const dataFromCSV = async () => {
      try {
        const csvData = await d3.csv('../../data/car_prices_subset.csv', (d: any) => {
          const sellingprice = d['sellingprice'] ? +d['sellingprice'] : NaN;
          if (!d['color'] || isNaN(sellingprice)) {
            return null; 
          }
          return {
            category: d['color'], 
            value: sellingprice 
          } as CategoricalBar;
        });
        const filteredData = csvData.filter(d => d !== null);

        // make sure the color has to be one of the following colors: "white","gray", "black", "red", "silver", "blue", "brown", "beige", "purple", "burgundy", "gold", "yellow", "green", "charcoal", "orange", "off-white", "turquoise", "pink", "lime"
        const colors = ["white","gray", "black", "red", "silver", "blue", "brown", "beige", "purple", "burgundy", "gold", "yellow", "green", "charcoal", "orange", "off-white", "turquoise", "pink", "lime"];
        const filteredData2 = filteredData.filter(d => colors.includes(d.category));

        // combine the colors that are similar
        const colorMap: { [key: string]: string } = {
          "gray": "silver",
          "charcoal": "black",
          "off-white": "white",
          "burgundy": "red",
          "turquoise": "blue",
          "lime": "green",
          "beige": "white",
          "gold": "yellow",
        };

        filteredData2.forEach(d => {
          if (colorMap[d.category]) {
            d.category = colorMap[d.category] || d.category;
          }
        });
        
        // calculate the average price for each color
        const groupedData = d3.group(filteredData2, d => d.category);
        const averageData = Array.from(groupedData, ([category, values]) => {
          const average = d3.mean(values, d => d.value) ?? 0;
          return { category, value: average };
        });

        // Sort the data in descending order of value
        averageData.sort((a, b) => d3.descending(a.value, b.value));
        // log the color of all the bars
        console.log('bar color', averageData.map(d => d.category));
        setBars(averageData);

      } catch (error) {
        console.error('Error loading CSV:', error);
      }
    };
    
    dataFromCSV();
  }, []);

  useEffect(() => {
    if (!bars.length || size.width === 0 || size.height === 0) return;

    const width = size.width - margin.left - margin.right;
    const height = size.height - margin.top - margin.bottom;

    // Clear previous SVG content
    d3.select('#bar-svg').selectAll('*').remove();

    const svg = d3.select('#bar-svg')
      .attr('width', size.width)
      .attr('height', size.height)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand()
      .domain(bars.map(d => d.category))
      .range([0, width])
      .padding(0.1);

    const y = d3.scaleLinear()
      .domain([6000, 21000])
      .nice()
      .range([height, 0]);

    // Define a color scale
    const colorScale = d3.scaleOrdinal()
      .domain(bars.map(d => d.category))
      .range([
        "#5d0000", // Brown
        "#000000", // Black
        "#FFFFFF", // White
        "#C0C0C0", // Silver
        "#1E90FF", // Blue
        "#8235ca", // Purple
        "#ff0000", // Red
        "#FFA500", // Orange
        "#FFFF00", // Yellow
        "#008000"  // Green
      ]);

      // set the opacity of all the bars to 0.7
    svg.selectAll('rect')
      .attr('opacity', 0.7);

    svg.append('g')
      .selectAll('rect')
      .data(bars)
      .enter().append('rect')
      .attr('x', d => x(d.category) ?? 0)
      .attr('y', d => y(d.value))
      .attr('width', x.bandwidth())
      .attr('height', d => height - y(d.value))
      .attr('fill', d => colorScale(d.category) as string)
      .attr('opacity', 0.7);

    svg.selectAll('rect')
    .filter((d: CategoricalBar) => d.category === "white")
    .attr('stroke', 'black')
    .attr('stroke-width', 1);

    svg.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x));

    svg.append('g')
      .attr('class', 'y-axis')
      .call(d3.axisLeft(y));

      svg.append('text')
      .attr('class', 'x-axis-label')
      .attr('text-anchor', 'middle')
      .attr('x', width / 2)
      .attr('y', height + margin.bottom - 35)
      .text('Color');

    svg.append('text')
      .attr('class', 'y-axis-label')
      .attr('text-anchor', 'middle')
      .attr('transform', 'rotate(-90)')
      .attr('x', -height / 2 )
      .attr('y', -margin.left + 20)
      .text('Average Selling Price');

    svg.append('text')
      .attr('x', size.width / 2)
      .attr('y', margin.top / 2 + 20)
      .attr('text-anchor', 'middle')
      .text('Average Selling Price by Car Color')
      .style('font-size', '2rem');
  }, [bars, size]);


  return (
    <div ref={barRef} className='chart-container'>
      <svg id='bar-svg' width='100%' height='100%'></svg>
    </div>
  );
}