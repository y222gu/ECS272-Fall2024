import React, { useEffect, useState, useRef } from 'react';
import * as d3 from 'd3';
import { useResizeObserver, useDebounceCallback } from 'usehooks-ts';
import { isEmpty } from 'lodash';

// Define types
interface CategoricalBar {
  category: string; // This represents Education Level
  value: number;    // This represents Loan Amount
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

export default function BoxPlot() {
  const [bars, setBars] = useState<CategoricalBar[]>([]);
  const barRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<ComponentSize>({ width: 0, height: 0 });
  const margin: Margin = { top: 40, right: 20, bottom: 80, left: 60 };
  
  // Set up debounce callback for resizing
  const onResize = useDebounceCallback((size: ComponentSize) => setSize(size), 200);

  // Set up resize observer for the chart container
  useResizeObserver({ ref: barRef, onResize });

  // Data loading logic (CSV)
  useEffect(() => {
    const dataFromCSV = async () => {
      try {
        const csvData = await d3.csv('../../data/car_prices.csv', (d: any) => {
          const sellingprice = d['sellingprice'] ? +d['sellingprice'] : NaN;
          if (!d['color'] || isNaN(sellingprice)) {
            return null; // Filter out invalid data
          }
          return {
            category: d['color'], // Access the education level
            value: sellingprice               // Convert loan amount to number
          } as CategoricalBar;
        });
        const filteredData = csvData.filter(d => d !== null); // Remove null values

        // make sure the color has to be one of the following colors: "white","gray", "black", "red", "silver", "blue", "brown", "beige", "purple", "burgundy", "gold", "yellow", "green", "charcoal", "orange", "off-white", "turquoise", "pink", "lime"
        const colors = ["white","gray", "black", "red", "silver", "blue", "brown", "beige", "purple", "burgundy", "gold", "yellow", "green", "charcoal", "orange", "off-white", "turquoise", "pink", "lime"];
        const filteredData2 = filteredData.filter(d => colors.includes(d.category));

        // combine the colors that are similar
        const colorMap: { [key: string]: string } = {
          "silver": "gray",
          "charcoal": "black",
          "off-white": "white",
          "burgundy": "red",
          "turquoise": "blue",
          "lime": "green"
        };

        filteredData2.forEach(d => {
          if (colorMap[d.category]) {
            d.category = colorMap[d.category] || d.category;
          }
        });
        
        setBars(filteredData2);
      } catch (error) {
        console.error('Error loading CSV:', error);
      }
    };
    
    dataFromCSV();
  }, []);

  // Chart rendering logic
  useEffect(() => {
    if (!bars.length || size.width === 0 || size.height === 0) return;

    d3.select('#bar-svg').selectAll('*').remove(); // Clear the previous chart
    initChart(); // Initialize new chart
  }, [bars, size]);

  function initChart() {
    const chartContainer = d3.select('#bar-svg');
    
    // Define scales
    const xScale = d3.scaleBand()
      .rangeRound([margin.left, size.width - margin.right])
      .domain([...new Set(bars.map(d => d.category))]) // Unique categories (Education Level)
      .padding(0.1);
      // log unique categories
      console.log([...new Set(bars.map(d => d.category))]);

    const yScale = d3.scaleLinear()
      .range([size.height - margin.bottom, margin.top])
      .domain([0, d3.max(bars, d => d.value) ?? 0]); // Max value (Loan Amount)

    // Define color same as the name of the category
    const colorScale = d3.scaleOrdinal(d3.schemeTableau10)
      .domain([...new Set(bars.map(d => d.category))]);

    // Group data by category (Education Level)
    const groupedData = d3.group(bars, d => d.category);

    // For each group, calculate quartiles and other boxplot stats
    const boxData = Array.from(groupedData, ([category, values]) => {
      const loanAmounts = values.map(d => d.value).sort(d3.ascending);
      const q1 = d3.quantile(loanAmounts, 0.25) ?? 0;
      const median = d3.quantile(loanAmounts, 0.5) ?? 0;
      const q3 = d3.quantile(loanAmounts, 0.75) ?? 0;
      const min = d3.min(loanAmounts) ?? 0;
      const max = d3.max(loanAmounts) ?? 0;

      return { category, min, q1, median, q3, max };
    });

    // Create axes
    chartContainer.append('g')
      .attr('transform', `translate(0, ${size.height - margin.bottom})`)
      .call(d3.axisBottom(xScale));

    chartContainer.append('g')
      .attr('transform', `translate(${margin.left}, 0)`)
      .call(d3.axisLeft(yScale));

    // Draw boxplot
    const boxWidth = xScale.bandwidth() * 0.7;

    const boxGroups = chartContainer.selectAll('g.box')
      .data(boxData)
      .join('g')
      .attr('transform', d => `translate(${(xScale(d.category) ?? 0) + xScale.bandwidth() / 2},0)`);

    // Draw the box (Q1 to Q3)
    boxGroups.append('rect')
      .attr('x', -boxWidth / 2)
      .attr('y', d => yScale(d.q3))
      .attr('width', boxWidth)
      .attr('height', d => yScale(d.q1) - yScale(d.q3))
      .attr('fill', d => colorScale(d.category))
      .attr('stroke', 'black');

    // Draw median line
    boxGroups.append('line')
      .attr('x1', -boxWidth / 2)
      .attr('x2', boxWidth / 2)
      .attr('y1', d => yScale(d.median))
      .attr('y2', d => yScale(d.median))
      .attr('stroke', 'black');

    // Draw whiskers (min to Q1 and Q3 to max)
    boxGroups.append('line')
      .attr('x1', 0)
      .attr('x2', 0)
      .attr('y1', d => yScale(d.min))
      .attr('y2', d => yScale(d.q1))
      .attr('stroke', 'black');

    boxGroups.append('line')
      .attr('x1', 0)
      .attr('x2', 0)
      .attr('y1', d => yScale(d.q3))
      .attr('y2', d => yScale(d.max))
      .attr('stroke', 'black');

    // Add title
    chartContainer.append('text')
      .attr('x', size.width / 2)
      .attr('y', margin.top / 2)
      .attr('text-anchor', 'middle')
      .text('Loan Amount Distribution by Education Level')
      .style('font-size', '1.2rem');

    // Add axis labels
    chartContainer.append('text')
      .attr('x', size.width / 2)
      .attr('y', size.height - 10)
      .attr('text-anchor', 'middle')
      .text('Education Level')
      .style('font-size', '1rem');

    chartContainer.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -size.height / 2 + 10)
      .attr('y', 20)
      .attr('text-anchor', 'middle')
      .text('Loan Amount')
      .style('font-size', '1rem');
  }

  return (
    <div ref={barRef} className='chart-container'>
      <svg id='bar-svg' width='100%' height='100%'></svg>
    </div>
  );
}