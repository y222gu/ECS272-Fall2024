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

interface BarPlotProps {
  onColorSelect?: (color: string | null) => void;
}

export default function BarPlot({ onColorSelect }: BarPlotProps) {
  const [bars, setBars] = useState<CategoricalBar[]>([]);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<ComponentSize>({ width: 0, height: 0 });
  const margin: Margin = {top: 80, right: 25, bottom: 70, left: 90 };

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
          return { category: d['color'], value: sellingprice } as CategoricalBar;
        });

        const filteredData = csvData.filter(d => d !== null);
        const colors = ["white", "gray", "black", "red", "silver", "blue", "brown", "beige", "purple", "burgundy", "gold", "yellow", "green", "charcoal", "orange", "off-white", "turquoise", "pink", "lime"];
        const filteredData2 = filteredData.filter(d => colors.includes(d.category));

        const colorMap: { [key: string]: string } = {
          "gray": "silver", "charcoal": "black", "off-white": "white", "burgundy": "red",
          "turquoise": "blue", "lime": "green", "beige": "white", "gold": "yellow",
        };

        filteredData2.forEach(d => { d.category = colorMap[d.category] || d.category; });

        const groupedData = d3.group(filteredData2, d => d.category);
        const averageData = Array.from(groupedData, ([category, values]) => {
          const average = d3.mean(values, d => d.value) ?? 0;
          return { category, value: average };
        });

        averageData.sort((a, b) => d3.descending(a.value, b.value));
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

    d3.select('#bar-svg').selectAll('*').remove();

    const svg = d3.select('#bar-svg')
      .attr('width', size.width)
      .attr('height', size.height)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand()
      .domain(bars.map(d => d.category))
      .range([0, width])
      .padding(0);

    const y = d3.scaleLinear()
      .domain([6000, 20000])
      .nice()
      .range([height, 0]);

    const colorScale = d3.scaleOrdinal()
    .domain(["white", "silver", "black", "red", "blue", "brown", "purple", "yellow", "green", "orange"])
    .range(["#FFFFFF", "#C0C0C0", "#000000", "#ff0000", "#1E90FF", "#5d0000", "#8235ca", "#FFFF00", "#008000", "#FFA500"]);

    svg.append('g')
      .selectAll('rect')
      .data(bars)
      .enter().append('rect')
      .attr('x', d => x(d.category) ?? 0)
      .attr('y', d => y(d.value))
      .attr('width', x.bandwidth())
      .attr('height', d => height - y(d.value))
      .attr('fill', d => colorScale(d.category) as string)
      .attr('opacity', d => (selectedColor && d.category !== selectedColor) ? 0.2 : 0.7)
      .on('click', (event, d) => {
        const newSelectedColor = selectedColor === d.category ? null : d.category;
        setSelectedColor(newSelectedColor);
        if (onColorSelect) {
          onColorSelect(newSelectedColor);
        }
      });

    // add borders to the bars if selected
    svg.selectAll('rect')
      .style('stroke', (d: CategoricalBar) => selectedColor && d.category === selectedColor ? 'black' : 'none')
      .style('stroke-width', 1);



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
      .attr('y', height + margin.bottom - 30)
      .text('Color');

    svg.append('text')
      .attr('class', 'y-axis-label')
      .attr('text-anchor', 'middle')
      .attr('transform', 'rotate(-90)')
      .attr('x', -height / 2)
      .attr('y', -margin.left+40)
      .text('Average Price')
      .style('font-size', '17');

    svg.append('text')
      .attr('x', 0)
      .attr('y', margin.top - 125)
      .attr('text-anchor', 'left')
      .style('font-size', '22px')
      .text('Average Sold Price by Color');

    svg.append('text')
      .attr('x', 0)
      .attr('y', margin.top - 105)
      .attr('text-anchor', 'left')
      .style('font-size', '14px')
      .style('fill', 'grey')
      .text('Click on the bar to focus on a color');
      
  }, [bars, size, selectedColor]);

  return (
    <div ref={barRef} className='chart-container'>
      <svg id='bar-svg' width='100%' height='100%'></svg>
      <div className="tooltip" style={{
        position: 'absolute',
        backgroundColor: 'white',
        border: '1px solid #ccc',
        padding: '5px',
        borderRadius: '4px',
      }}></div>
    </div>
  );
}
