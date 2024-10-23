import React, { useEffect, useState, useRef } from 'react';
import * as d3 from 'd3';
import { useResizeObserver, useDebounceCallback } from 'usehooks-ts';
import { isEmpty } from 'lodash';

interface DataPoint {
  'Depression': string;
  'Anxiety': string;
  'PanicAttack': string;
  'Treatment': string;
  'CGPA': number;
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
const width = 500 - MARGIN.left - MARGIN.right;
const height = 400 - MARGIN.top - MARGIN.bottom;

export default function ParallelPlot() {
  const [data, setData] = useState<DataPoint[]>([]);
  const plotRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<ComponentSize>({ width: 0, height: 0 });

  const onResize = useDebounceCallback((size: ComponentSize) => setSize(size), 200);
  useResizeObserver({ ref: plotRef, onResize });

  useEffect(() => {
    const dataFromCSV = async () => {
      try {
        const csvData = await d3.csv('../../data/Student_Mental_health.csv', (d: any) => {
          const parsedData: DataPoint = {
            'Depression': d['Do you have Depression?'] || '',
            'Anxiety': d['Do you have Anxiety?'] || '',
            'PanicAttack': d['Do you have Panic attack?'] || '',
            'Treatment': d['Did you seek any specialist for a treatment?'] || '',
            'CGPA': d['What is your CGPA?']|| ''
          };
          return parsedData;
        });

        // Filter out empty values, all values are strings
        const filteredData = csvData.filter(d =>
          d['Depression'] &&
          d['Anxiety'] &&
          d['PanicAttack'] &&
          d['Treatment'] &&
          d['CGPA']
        );

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

  // Define the dimensions for the parallel plot
  const dimensions = ['Depression', 'Anxiety', 'PanicAttack', 'Treatment']; 

  // Create scales for each dimension with each categorical values
  const scales: { [key: string]: d3.ScalePoint<string> } = {};

  // Define scales for each categorical dimension with string values
    dimensions.forEach((dim) => {
        scales[dim] = d3.scalePoint()
        .domain(["Yes", "No"])
        .range([size.height - MARGIN.bottom, 0]);
    });
    
  // Color Scale for 'CGPA'
    let color = d3.scaleOrdinal()
    .domain(["0 - 1.99", "2.00 - 2.49", "2.50 - 2.99", "3.00 - 3.49", "3.50 - 4.00"])
    .range(["#e41a1c", "#377eb8", "#4daf4a", "#984ea3", "#ff7f00"]);

    const x = d3.scalePoint()
    .range([0, size.width])
    .padding(1)
    .domain(dimensions);

  // The path function take a row of the csv as input, and return x and y coordinates of the line to draw for this raw.
  function path(d: { [x: string]: any; }) {
    return d3.line()(dimensions.map(function(p) { return [x(p)!, scales[p](d[p])!]; }));
}

// Draw the lines
// const line = d3.line()
//   .x((d, i) => scales[dimensions[i]](d) ?? 0)
//   .y((d, i) => i * (size.width / dimensions.length));

//   // Iterate over each row in the data and generate a path
//   data.forEach(d => {
//     const pathData = dimensions.map(dim => d[dim]);
//     svg.append('path')
//       .data(pathData)
//       .attr('d', path)
//       .attr('fill', 'none')
//       .attr('stroke', 'steelblue')
//       .attr('stroke-width', 1.5);
//   });

const parallelPlots = svg.append("g")
  .selectAll("myPath")
  .data(data)
  .enter().append("path")
  .attr("d", path)
  .style("fill", "none")
  .style("stroke", function(d) { return color(d['CGPA']); })
  .style("opacity", 0.5); 


// Draw the axis:
svg.selectAll("myAxis")
  // For each dimension of the dataset I add a 'g' element:
  .data(dimensions).enter()
  .append("g")
  // I translate this element to its right position on the x axis
  .attr("transform", function(d) { return "translate(" + x(d) + ")"; })
  // And I build the axis with the call function
  .each(function(d) { d3.select(this).call(d3.axisLeft(scales[d])); })
  // Add axis title
  .append("text")
    .style("text-anchor", "middle")
    .attr("y", -9)
    .text(function(d) { return d; })
    .style("fill", "black")

  }
  return (
    <div ref={plotRef}>
      <svg id="parallel-svg" />
    </div>
  );
}

