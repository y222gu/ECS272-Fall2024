import React, { useEffect, useState, useRef } from 'react';
import * as d3 from 'd3';
import { useResizeObserver, useDebounceCallback } from 'usehooks-ts';

interface CarData {
  year: number;
  color: string; 
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
          const color = d['color'] || '';
          if (isNaN(year) || !color) return null;
          return { year, color } as CarData;
        });
        const filteredData = csvData.filter(d => d !== null); // Remove invalid rows

        // make sure the color has to be one of the following colors: "white","gray", "black", "red", "silver", "blue", "brown", "beige", "purple", "burgundy", "gold", "yellow", "green", "charcoal", "orange", "off-white", "turquoise", "pink", "lime"
        const colors = ["white","gray", "black", "red", "silver", "blue", "brown", "beige", "purple", "burgundy", "gold", "yellow", "green", "charcoal", "orange", "off-white", "turquoise", "pink", "lime"];
        const filteredData2 = filteredData.filter(d => colors.includes(d.color));

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
          if (colorMap[d.color]) {
            d.color = colorMap[d.color] || d.color;
          }
        });

        setData(filteredData2);
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

    const groupedData = d3.groups(data, d => d.year, d => d.color)
      .map(([year, colorData]) => {
        const counts: { year: number; [color: string]: number } = { year: +year };
        colorData.forEach(([color, cars]) => {
          counts[color] = cars.length;
        });
        return counts;
      });

    const colors = Array.from(new Set(data.map(d => d.color)));
    const initialStack = d3.stack()
      .keys(colors)
      .value((d, key) => d[key] || 0)
      (groupedData);

      const colorTotals = colors.map(color => ({
        color,
        total: d3.sum(groupedData, d => d[color] || 0)
      }));
      
      // 3. Sort colors by total cars in descending order.
      colorTotals.sort((a, b) => b.total - a.total);
      
      // 4. Extract the sorted color keys.
      const sortedColors = colorTotals.map(d => d.color);
      
      // 5. Apply the sorted colors to the stack.
      const stack = d3.stack()
        .keys(sortedColors)
        .value((d, key) => d[key] || 0)
        (groupedData);

    const xScale = d3.scaleLinear()
      .domain(d3.extent(data, d => d.year) as [number, number])
      .range([margin.left, size.width - margin.right]);

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(stack, d => d3.max(d, d => d[1])) as number])
      .range([size.height - margin.bottom, margin.top]);
      // map the colors to the domain first
    const range_colors ={

      "White":"#FFFFFF",
      "Black":"#000000",
      "Blue": "#1E90FF",
      "Red": "#ff0000",
      "Silver":"#C0C0C0", 
      "Brown": "#5d0000",
      "Purple": "#8235ca",
      "Yellow": "#FFFF00",
      "Green": "#008000",
      "Orange": "#FFA500"};



      //map the color from range_color
    const colorScale = d3.scaleOrdinal()
      .domain(["white", "silver", "black", "red", "blue", "brown", "purple", "yellow", "green", "orange"])
      .range(["#FFFFFF", "#C0C0C0", "#000000", "#ff0000", "#1E90FF", "#5d0000", "#8235ca", "#FFFF00", "#008000", "#FFA500"]);


    const area = d3.area<any>()
      .x(d => xScale(d.data.year))
      .y0(d => yScale(d[0]))
      .y1(d => yScale(d[1]))
      .curve(d3.curveBasis); // Smooth the curves

    chartContainer.selectAll('path')
      .data(stack)
      .join('path')
      .attr('d', area)
      .attr('fill', d => colorScale(d.key) as string)
      // .attr('stroke', 'black')
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
      .text('Number of Cars Sold by Color per Year')
      .style('font-size', '2rem');

    // Define legend data
    const legendData = [
        {color:"#FFFFFF", label: "White"},
        {color:"#C0C0C0", label: "Silver"},
        {color:"#000000", label: "Black"},
        {color:"#ff0000", label: "Red"},
        {color:"#1E90FF", label: "Blue"},
        {color:"#5d0000", label: "Brown"},
        {color:"#8235ca", label: "Purple"},
        {color:"#FFFF00", label: "Yellow"},
        {color:"#008000", label: "Green"},
        {color:"#FFA500", label: "Orange"}
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
