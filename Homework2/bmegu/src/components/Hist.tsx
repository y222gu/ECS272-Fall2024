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

export default function Hist() {
  const [bars, setBars] = useState<CategoricalBar[]>([]);
  const barRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<ComponentSize>({ width: 0, height: 0 });
  const margin: Margin = { top: 40, right: 20, bottom: 80, left: 60 };
  
  // Set up debounce callback for resizing
  const onResize = useDebounceCallback((size: ComponentSize) => setSize(size), 200);

  // Set up resize observer for the chart container
  useResizeObserver({ ref: barRef, onResize });

  useEffect(() => {
    const dataFromCSV = async () => {
      try {
        const csvData = await d3.csv('../../data/financial_risk_assessment.csv', (d: any) => {
          const income = d['Income'] ? +d['Income'] : NaN;  // Load income data
          if (!d['Education Level'] || isNaN(income)) {
            return null;  // Filter out invalid data
          }
          return {
            category: d['Education Level'],  // Access the education level
            value: income                    // Use income instead of loan amount
          } as CategoricalBar;
        });
        const filteredData = csvData.filter(d => d !== null);  // Remove null values
        setBars(filteredData);
      } catch (error) {
        console.error('Error loading CSV:', error);
      }
    };
  
    dataFromCSV();
  }, []);
  
  function initChart() {
    const chartContainer = d3.select('#bar-svg');
    
    // Define the scales
    const xScale = d3.scaleBand()
      .rangeRound([margin.left, size.width - margin.right])
      .domain([...new Set(bars.map(d => d.category))])  // Unique categories (Education Level)
      .padding(0.1);
  
    const yScale = d3.scaleLinear()
      .range([size.height - margin.bottom, margin.top]);
  
    // Group data by category (Education Level)
    const groupedData = d3.group(bars, d => d.category);
  
    const maxIncome = d3.max(bars, d => d.value) ?? 0;  // Find max income for scaling
    const binCount = 20;  // Number of bins for the histogram
  
    groupedData.forEach((values, category) => {
      const incomeValues = values.map(d => d.value);
      
      // Create a histogram for each education level
      const histogram = d3.histogram()
        .domain([0, maxIncome])
        .thresholds(binCount)(incomeValues);  // Create bins for the income distribution
  
      // Adjust yScale based on the frequency of the data (max count in bins)
      yScale.domain([0, d3.max(histogram.map(d => d.length).filter(d => d !== undefined)) ?? 0]);
  
      // Draw the bars for the histogram
      const barGroup = chartContainer.append('g')
        .attr('transform', `translate(${(xScale(category) ?? 0) + xScale.bandwidth() / 2},0)`);
  
      const barWidth = xScale.bandwidth() * 0.8 / binCount;  // Adjust the bar width
  
      barGroup.selectAll('rect')
        .data(histogram)
        .enter().append('rect')
        .attr('x', (d, i) => i * barWidth - barWidth / 2)
        .attr('y', d => yScale(d.length))
        .attr('width', barWidth)
        .attr('height', d => size.height - margin.bottom - yScale(d.length))
        .attr('fill', d3.schemeTableau10[0])
        .attr('stroke', 'black');
    });
  
    // Create axes
    chartContainer.append('g')
      .attr('transform', `translate(0, ${size.height - margin.bottom})`)
      .call(d3.axisBottom(xScale));
  
    chartContainer.append('g')
      .attr('transform', `translate(${margin.left}, 0)`)
      .call(d3.axisLeft(yScale));
  
    // Add title and axis labels
    chartContainer.append('text')
      .attr('x', size.width / 2)
      .attr('y', margin.top / 2)
      .attr('text-anchor', 'middle')
      .text('Income Distribution by Education Level')
      .style('font-size', '1.2rem');
  
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
      .text('Frequency')
      .style('font-size', '1rem');
  }

  useEffect(() => {
    if (!isEmpty(bars) && size.width > 0 && size.height > 0) {
      initChart();
    }
  }, [bars, size]);

  return (
    <div ref={barRef} className="chart-container">
      <svg id="bar-svg" width={size.width} height={size.height} />
    </div>
  );
}