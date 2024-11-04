import * as d3 from "d3";
import { sankey as d3Sankey, sankeyLinkHorizontal, SankeyNodeMinimal, SankeyLinkMinimal } from "d3-sankey";
import { useEffect } from "react";

// Define interfaces for nodes and links
interface Node extends SankeyNodeMinimal<Node, Link> {
  name: string;
}

interface Link extends SankeyLinkMinimal<Node, Link> {
  source: number;
  target: number;
  value: number;
}

// Define the path to the CSV file
const csvPath = "../../data/car_prices_subset.csv";

// Function to get contrasting text color (black or white) based on background color
const getContrastingTextColor = (color: string) => {
    const rgb = d3.color(color) as d3.RGBColor;
    const brightness = rgb.r * 0.299 + rgb.g * 0.587 + rgb.b * 0.114;
    return brightness > 140 ? "#000" : "#fff";  // Choose black for light colors, white for dark
};

// Define the SankeyDiagram component
const SankeyDiagram = () => {
  useEffect(() => {
    // Load CSV data
    d3.csv(csvPath).then(data => {
      // Prepare a dynamic color mapping based on colors in the data
      const uniqueColors = Array.from(new Set(data.map(d => d.color)));
      const colorScale = d3.scaleOrdinal(d3.schemeCategory10).domain(uniqueColors);

      // Aggregate data by color and make
      const aggregated = d3.rollup(data,
        v => v.length,
        d => d.color, // Use color from data
        d => d.make
      );

      // Prepare nodes and links for the Sankey diagram
      const nodes: Node[] = [];
      const links: Link[] = [];

      const colorMap: { [key: string]: number } = {};
      const makeMap: { [key: string]: number } = {};

      // Process the aggregated data to create nodes and links
      aggregated.forEach((makes, color) => {
          if (!colorMap[color]) {
              colorMap[color] = nodes.length;
              nodes.push({ name: color }); // Color node
          }

          makes.forEach((count, make) => {
              if (!makeMap[make]) {
                  makeMap[make] = nodes.length;
                  nodes.push({ name: make }); // Make node
              }
              links.push({ source: colorMap[color], target: makeMap[make], value: count });
          });
      });

      // Clear any previous SVG elements
      d3.select('#sankey-svg').selectAll('*').remove();

      // Set up the Sankey diagram
      const svg = d3.select("#sankey-svg");
      const width = +svg.attr("width");
      const height = +svg.attr("height");

      const sankey = d3Sankey<Node, Link>()
          .nodeWidth(20)
          .nodePadding(20) // Increase padding to reduce overlap
          .extent([[0, 0], [width, height]]);

      // Construct the Sankey layout
      const { nodes: sankeyNodes, links: sankeyLinks } = sankey({
          nodes: nodes.map(d => Object.assign({}, d)), // Deep copy to avoid mutation
          links: links.map(d => Object.assign({}, d))
      });

      // Draw links
      svg.append("g")
          .selectAll("path")
          .data(sankeyLinks)
          .join("path")
          .attr("d", sankeyLinkHorizontal())
          .attr("class", "link")
          .style("stroke-width", (d: any) => Math.max(1, d.width))
          .style("fill", "none")
          .style("stroke", (d: any) => colorScale(d.source.name)) // Color based on source node
          .style("opacity", 0.7);

      // Draw nodes
      const nodeGroup = svg.append("g").selectAll("g")
          .data(sankeyNodes)
          .join("g")
          .attr("transform", (d: any) => `translate(${d.x0},${d.y0})`);

      nodeGroup.append("rect")
          .attr("height", (d: any) => d.y1 - d.y0)
          .attr("width", sankey.nodeWidth())
          .style("fill", (d: any) => colorScale(d.name)) // Assign color based on name
          .style("stroke", "#333");

      // Add labels with black text color
      nodeGroup.append("text")
          .attr("x", sankey.nodeWidth() / 2)
          .attr("y", (d: any) => (d.y1 - d.y0) / 2)
          .attr("dy", "0.35em")
          .attr("text-anchor", "middle")
          .attr("font-size", "10px")
          .text((d: any) => d.name)
          .style("fill", "#000"); // Set text color to black
    });
  }, []);

  return (
    <svg id="sankey-svg" width="1000" height="600"></svg>
  );
};

export default SankeyDiagram;