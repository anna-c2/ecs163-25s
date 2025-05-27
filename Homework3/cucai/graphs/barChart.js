// determine price range given the price
function getPriceRange(price) {
  if (price <= 20) return "<= $20";
  if (price <= 40) return "$20-40";
  if (price <= 60) return "$40-60";
  if (price <= 80) return "$60-80";
  if (price <= 100) return "$80-100";
  return "$100+";
}

const barPriceRanges = ["<= $20", "$20-40", "$40-60", "$60-80", "$80-100", "$100+"];
const categories = ["SPF", "NonSPF"];
const barProducts = {};
let currentOrder = "default";
// for each price range, initialize spf and nonspf count to 0
barPriceRanges.forEach(r => barProducts[r] = { SPF: 0, NonSPF: 0 });

// process data
d3.csv("cosmetics.csv").then(rawData => {
  
  // for each product, determine if it is a spf product and add to sum 
  rawData.forEach(product => {
    const range = getPriceRange(+product.Price);
    if (product.Name.includes("SPF")) {
      barProducts[range].SPF += 1;
    } else {
      barProducts[range].NonSPF += 1;
    }
  });

  const barChartData = barPriceRanges.map(range => ({
    barPriceRanges: range,
    SPF: barProducts[range].SPF,
    NonSPF: barProducts[range].NonSPF
  }));

  // Prepare data for grouped bars BEFORE using it
  const groupedData = barChartData.flatMap(d => 
    categories.map(category => ({
      priceRange: d.barPriceRanges,
      category: category,
      value: d[category]
    }))
  );

  // Set the dimensions and margins of the graph
  const margin = { top: 30, right: 30, bottom: 50, left: 60 };
  const width = 700 - margin.left - margin.right;
  const height = 300 - margin.top - margin.bottom;

  // Select the heatmap svg in html file
  const svgWidth = width + margin.left + margin.right;
  const svgHeight = height + margin.top + margin.bottom;
  
  //responsive resizing of chart
  const svg = d3.select("#barChart")
    .attr("viewBox", `0 0 ${svgWidth} ${svgHeight}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .style("width", "100%")
    .style("height", "auto");

  const chartGroup = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Create original scales
  const xOriginal = d3.scaleBand()
    .domain(barPriceRanges)
    .range([0, width])
    .padding(0.2);

  // Sub-scale for grouping bars within each price range
  const xSubOriginal = d3.scaleBand()
    .domain(categories)
    .range([0, xOriginal.bandwidth()])
    .padding(0.05);

  const y = d3.scaleLinear()
    .domain([0, d3.max(groupedData, d => d.value)])
    .nice()
    .range([height, 0]);

  // set colors for the nonspf and spf bars
  const color = d3.scaleOrdinal()
    .domain(categories)
    .range(["#735751", "#b69121"]);

  // Create bars group 
  const barsGroup = chartGroup.append("g")
    .attr("class", "bars")
  
  // Create axis
  const xAxisGroup = chartGroup.append("g")
  .attr("class", "x-axis")
  .attr("transform", `translate(0,${height})`);

  const yAxisGroup = chartGroup.append("g")
    .attr("class", "y-axis");

  // Create current scales that will be modified by zoom
  let xCurrent = xOriginal.copy();
  let xSubCurrent = xSubOriginal.copy();

  /**
   * Updates and redraws the grouped bar chart based on sorting order, zoom, and animation settings.
   * @param {*} order : sorting order chosen by user or default
   * @param {*} animate : true = animated changes, false = instant changes
   * @param {*} transform : object used to apply zoom scaling
   */
  function updateChart(order = currentOrder, animate = true, transform = null) {
    currentOrder = order;
    let reorderedData = groupedData.slice();
    
    // If user wants the data sorted -> sort the x-axis domain based on SPF values
    if (order === "asc" || order === "desc") {
      const sortedRanges = [...barPriceRanges].sort((a, b) => {
        const aVal = barProducts[a].SPF;
        const bVal = barProducts[b].SPF;
        return order === "asc" ? aVal - bVal : bVal - aVal;
      });
      xOriginal.domain(sortedRanges);
    } else {
      xOriginal.domain(barPriceRanges); //// Use default domain
    }
  
    transform = d3.zoomTransform(chartGroup.node());
    
    // Apply zoom transformation to x-axis range
    const newRange = xOriginal.range().map(d => transform.applyX(d));

    // Create updated x-axis scale with zoomed range
    xCurrent = d3.scaleBand()
      .domain(xOriginal.domain())
      .range(newRange)
      .padding(xOriginal.padding());
    
    // Create updated sub-x scale for grouped bars (SPF and NonSPF)
    xSubCurrent = d3.scaleBand()
      .domain(categories)
      .range([0, xCurrent.bandwidth()])
      .padding(xSubOriginal.padding());
    
    // Transition timing
    const t = animate ? d3.transition().duration(750) : d3.transition().duration(0);
    
    // New scales for axes and apply transition
    xAxisGroup.transition(t).call(d3.axisBottom(xCurrent));
    yAxisGroup.transition(t).call(d3.axisLeft(y));
  
    const bars = barsGroup.selectAll("rect")
      .data(reorderedData, d => `${d.priceRange}-${d.category}`);
    
    // Remove bars that are no longer needed/out of view
    bars.exit().transition(t).attr("height", 0).remove();
    
    // Enter bars that don't have a <rect> element yet
    const barsEnter = bars.enter().append("rect")
      .attr("y", y(0))
      .attr("height", 0)
      .attr("fill", d => color(d.category));
    
    // update existing and new bars uniformly
    barsEnter.merge(bars)
      .transition(t)
      .delay((d, i) => i * 100)
      .attr("x", d => xCurrent(d.priceRange) + xSubCurrent(d.category))
      .attr("y", d => y(d.value))
      .attr("width", xSubCurrent.bandwidth())
      .attr("height", d => height - y(d.value));
  }
  
  // Initial chart render
  updateChart("default");
  
  // Create zoom behavior
  const zoom = d3.zoom()
    .scaleExtent([1, 8])
    .translateExtent([[0, 0], [width, height]])
    .extent([[0, 0], [width, height]])
    .on("zoom", handleZoom);

  // respond to zoom event
  function handleZoom(event) {
    updateChart(currentOrder, false, event.transform); 
  }

  // reorder the bars when the selected order changes
  d3.select("#order").on("change", function () {
    const selectedOrder = d3.select(this).property("value");
    // Reset zoom and then animate update
    chartGroup.transition()
      .duration(750)
      .call(zoom.transform, d3.zoomIdentity)
      .on("end", () => updateChart(selectedOrder, true)); // animate reorder AFTER zoom resets
  });

  // Apply zoom to the chart area
  chartGroup.call(zoom);

  // Legend
  const legend = svg.append("g")
    .attr("transform", `translate(${width}, 20)`);

  categories.forEach((category, i) => {
    legend.append("rect")
      .attr("y", i * 20)
      .attr("width", 15)
      .attr("height", 15)
      .attr("fill", color(category));
    
    legend.append("text")
      .attr("x", 20)
      .attr("y", i * 20 + 12)
      .text(category)
      .style("font-size", "12px");
  });

  // Title
  svg.append("text")
    .attr("x", (width + margin.left + margin.right) / 2)
    .attr("y", margin.top / 2)
    .attr("text-anchor", "middle")
    .style("font-size", "16px")
    .text("Price of Products With vs Without SPF");

  // X label
  svg.append("text")
    .attr("x", (width + margin.left + margin.right) / 2)
    .attr("y", height + margin.top + 40)
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .text("Price Range");

  // Y label
  svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", margin.left / 4)
    .attr("x", -(height + margin.top + margin.bottom) / 2)
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .text("Number of Products");

});