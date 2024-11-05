import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { useResizeObserver, useDebounceCallback } from 'usehooks-ts';
import { SeriesPoint } from 'd3-shape';

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
const StreamGraph: React.FC = () => {
  const svgRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<{ [key: string]: { [key: string]: number } }>({});
  const [size, setSize] = useState<ComponentSize>({ width: 0, height: 0 });

  const onResize = useDebounceCallback((size: ComponentSize) => setSize(size), 200);

  useResizeObserver({ ref: svgRef, onResize });

  const loadData = async () => {
    try {
      const csvData = await d3.csv('../../data/car_prices_subset.csv', (d: any) => {
        const year = d['year'] ? +d['year'] : NaN;
        const color = d['color'] || '';
        if (isNaN(year) || !color) return null;
        return { year, color };
      });

      const filteredData = csvData.filter(d => d !== null);
      const allowed_colors = ["white", "gray", "black", "red", "silver", "blue", "brown", "beige", "purple", "burgundy", "gold", "yellow", "green", "charcoal", "orange", "off-white", "turquoise", "pink", "lime"];
      const mappedData = filteredData.filter(d => allowed_colors.includes(d.color));

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

      mappedData.forEach(d => {
        if (colorMap[d.color]) {
          d.color = colorMap[d.color] || d.color;
        }
      });

      // Count the number of cars for each color and each year
      const colorCounts: { [color: string]: { [year: number]: number } } = {};
      const allYears = Array.from(new Set(mappedData.map(d => d.year)));

      mappedData.forEach(d => {
        if (!colorCounts[d.color]) {
          colorCounts[d.color] = {};
          allYears.forEach(year => {
            colorCounts[d.color][year] = 0;
          });
        }
        colorCounts[d.color][d.year]++;
      });

      const formattedData: { [year: number]: { [color: string]: number } } = {};

      Object.keys(colorCounts).forEach(color => {
        Object.keys(colorCounts[color]).forEach(year => {
          if (!formattedData[+year]) {
            formattedData[+year] = { year: +year };
          }
          formattedData[+year][color] = colorCounts[color][+year];
        });
      });

      setData(formattedData);
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (Object.keys(data).length === 0 || size.width === 0 || size.height === 0) return;

    d3.select('#stream-svg').selectAll('*').remove();

    const margin: Margin = { top: 70, right: 20, bottom: 60, left: 60 };
    const width = size.width - margin.left - margin.right;
    const height = size.height - margin.top - margin.bottom;

    const svg = d3.select("#stream-svg")
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Convert data object to array
    const dataArray = Object.values(data);

    // List of groups (keys)
    const keys = Object.keys(dataArray[0]).filter(key => key !== 'year');

    // X axis
    const x = d3.scaleLinear()
      .domain(d3.extent(dataArray, (d: any) => d.year) as [number, number])
      .range([0, width]);
    svg.append("g")
      .attr("transform", "translate(0," + height*0.9 + ")")
      .call(d3.axisBottom(x).tickSize(-height*.8).tickValues([2001, 2005, 2010, 2015, 2020]).tickFormat(d3.format("d")))
      .select(".domain").remove()

    // Customization
    svg.selectAll(".tick line").attr("stroke", "#b8b8b8")
    // x labels
    svg.append("text")
      .attr("text-anchor", "end")
      .attr("x", width/2)
      .attr("y", height)
      .text("Time (year)");

    // Y axis
    const y = d3.scaleLinear()
      .domain([-350, 350])
      .range([height, 0]);

    // Color palette
    const color = d3.scaleOrdinal<string>()
      .domain(["white", "silver", "black", "red", "blue", "brown", "purple", "yellow", "green", "orange"])
      .range(["#FFFFFF", "#C0C0C0", "#000000", "#ff0000", "#1E90FF", "#5d0000", "#8235ca", "#FFFF00", "#008000", "#FFA500"]);

    // Stack the data
    const stackedData = d3.stack()
      .offset(d3.stackOffsetSilhouette)
      .keys(keys)
      (dataArray)

    // create a tooltip
    var Tooltip = svg
      .append("text")
      .attr("x", 0)
      .attr("y", 0)
      .style("opacity", 0)
      .style("font-size", 17)

    // Three function that change the tooltip when user hover / move / leave a cell
    var mouseover = function (this: SVGPathElement, d: any) {
      Tooltip.style("opacity", 1)
      d3.selectAll(".myArea").style("opacity", .2)
      d3.select(this)
        .style("stroke", "black")
        .style("opacity", 1)
    }
    var mousemove = function (event: any, d: any) {
      let grp = d.key;
      Tooltip.text(grp);
    }
    var mouseleave = function (d: any) {
      Tooltip.style("opacity", 0)
      d3.selectAll(".myArea").style("opacity", 1).style("stroke", "none")
    }

    // Area generator
    var area = d3.area<SeriesPoint<{ [key: string]: number }>>()
      .curve(d3.curveBasis) // Apply curve interpolation here
      .x(function (d) { return x(d.data.year); })
      .y0(function (d) { return y(d[0]); })
      .y1(function (d) { return y(d[1]); })

    // Show the areas
    svg
      .selectAll("mylayers")
      .data(stackedData)
      .enter()
      .append("path")
      .attr("class", "myArea")
      .style("fill", function (d) { return color(d.key); })
      .attr("d", area)
      .on("mouseover", mouseover)
      .on("mousemove", mousemove)
      .on("mouseleave", mouseleave);

      // Add title to the heatmap
    svg.append('text')
      .attr('x', 0)
      .attr('y', margin.top - 105)
      .attr('text-anchor', 'left')
      .style('font-size', '22px')
      .text('Cars Sold by Year');

    // Add subtitle to the heatmap
    svg.append('text')
      .attr('x', 0)
      .attr('y', margin.top - 85)
      .attr('text-anchor', 'left')
      .style('font-size', '14px')
      .style('fill', 'grey')
      .text('Count of cars sold per color and year');


  }, [data, size]);

  return (
    <div ref={svgRef} style={{ width: '100%', height: '100%' }}>
      <svg id='stream-svg' width='100%' height='100%'></svg>
    </div>
  );
};

export default StreamGraph;
