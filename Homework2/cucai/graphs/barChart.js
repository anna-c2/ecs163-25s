/* Insights:
 	Do products that have SPF cost more?
        No, they reflect the general trend / same shape of nonSPF products vs price.
*/

/** 
  * This function determines which price range a product belongs in
  * @param {number} price: price of product as a number
  * @returns {string} price range label
*/
function getPriceRange(price){
    if(price <= 20){
        return "<= $20";
    } else if (price <= 40){
        return "$20-40";
    } else if (price <= 60){
        return "$40-60";
    } else if(price <= 80){
        return "$60-80";
    } else if (price <= 100){
        return "$80-100";
    } else{
        return "$100+";
    }
}

const barProducts = {};
const barPriceRanges = ["<= $20", "$20-40", "$40-60", "$60-80", "$80-100", "$100+"];

// read and process data
d3.csv("cosmetics.csv").then(rawData => {
    // Initialize products object
    barPriceRanges.forEach(range => {
        barProducts[range] = {SPF: 0, NonSPF: 0};
    });

    // Count products in each category
    rawData.forEach(product => {
        const barPriceRanges = getPriceRange(+product.Price);
        if(product.Name.includes("SPF")){
            barProducts[barPriceRanges].SPF += 1;
        } else{
            barProducts[barPriceRanges].NonSPF += 1;
        }
    });

    // prepare data to use in the chart
    const barChartData = barPriceRanges.map(range => ({
        barPriceRanges: range,
        SPF: barProducts[range].SPF,  
        NonSPF: barProducts[range].NonSPF
    }));

    const margin = { top: 30, right: 30, bottom: 50, left: 60 },
      width = 400 - margin.left - margin.right,
      height = 300 - margin.top - margin.bottom;

    // selects barChart svg in html file
    const svg = d3.select("#barChart")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // stack categories
    const categories = ["SPF", "NonSPF"];

    // map price range categories to x-axos
    const x = d3.scaleBand()
        .domain(barPriceRanges) 
        .range([0, width])
        .padding(0.1);
    
    // sum of SPF and nonSPF products to y-axis
    const y = d3.scaleLinear()
      .domain([0, d3.max(barChartData, d => d.SPF + d.NonSPF)])
      .nice() //rounds number up
      .range([height, 0]);
    
    //  color encoding of nonspf vs spf bars
    const color = d3.scaleOrdinal()
      .domain(categories)
      .range(["#b27cde", "#e3cef5"]);
  
    // stack the data
    const stack = d3.stack()
      .keys(categories);
  
    const stackedData = stack(barChartData);
  
    // create the bars
    svg.append("g")
      .selectAll("g")
      .data(stackedData)
      .enter()
      .append("g")
      .attr("fill", d => color(d.key))
      .selectAll("rect")
      .data(d => d)
      .enter()
      .append("rect")
      .attr("x", d => x(d.data.barPriceRanges))
      .attr("y", d => y(d[1]))
      .attr("height", d => y(d[0]) - y(d[1]))
      .attr("width", x.bandwidth());
  
    // Add x-axis
    svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .selectAll("text")
      .style("text-anchor", "middle");
  
    // Add y-axis
    svg.append("g")
      .call(d3.axisLeft(y));

    // Add legend
    const legend = svg.append("g")
      .attr("transform", `translate(${width - 100}, 20)`);

    categories.forEach((category, i) => {
        legend.append("rect")
          .attr("y", i * 20)
          .attr("width", 15)
          .attr("height", 15)
          .attr("fill", color(category));
        
        legend.append("text")
          .attr("x", 20)
          .attr("y", i * 20 + 12)
          .text(category);
    });

    // display title
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", -10) 
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .text("Price of Products With vs Without SPF");
    
    // display x-axis label
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height + 40) 
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .text("Price Range");
    
    // display y-axis
    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -45)
        .attr("x", -height / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .text("Number of Products");
});