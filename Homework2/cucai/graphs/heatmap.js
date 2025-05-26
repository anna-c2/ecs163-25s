/* Insights:
 	Are products targeting certain skin types more expensive than others?
        No, most products across all skin types cost around $20-40. 
*/

// set the dimensions and margins of the graph
var margin = {top: 30, right: 30, bottom: 70, left: 100},
    width = 500 - margin.left - margin.right,
    height = 350 - margin.top - margin.bottom;

// selects the heatmap svg in html file
var svg = d3.select("#heatmap")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    // display title
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", -10) 
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .text("Price Distribution Across Products for Different Skin Types");
    
    
var priceRanges = ["$100+", "$80-100", "$60-80", "$40-60","$20-40","<= $20"];

var skinTypes = ["Sensitive", "Dry", "Combination", "Normal", "Oily"];

// create x scale
var x = d3.scaleBand()
    .range([0, width])
    .domain(skinTypes)
    .padding(0.01);

//display x axis
svg.append("g")
    .attr("transform", "translate(0," + height + ")")
    .call(d3.axisBottom(x))
    .attr("color", "black");

// label x axis 
svg.append("text")
    .attr("x", width / 2)
    .attr("y", height + 60) 
    .attr("text-anchor", "middle")
    .style("font-size", "16px")
    .text("Skin Type");

// create y scale
var y = d3.scaleBand()
    .range([ 0, height ])
    .domain(priceRanges)
    .padding(0.01);

// display y axis
svg.append("g")
    .call(d3.axisLeft(y));

// label y axis
svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", -65) 
    .attr("x", -height / 2)
    .attr("text-anchor", "middle")
    .style("font-size", "16px")
    .text("Price Range");

// determines color of rectangle based on quantity products in the category
var myColor = d3.scaleLinear()
    .range(["#c3d9e4", "#a1bdd9", "#7aaccb", "#4f8db9", "#2f6994"])
    .domain([0, 100, 150, 200, 250, 300]); 

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

// array to store products
const products = [];

// read/process the data
d3.csv("cosmetics.csv").then(rawData => { 

    // go through each product. assign price range and skin type. create and push new object to products array 
    rawData.forEach(product => {
        const priceRange = getPriceRange(+product.Price);
        if(+product.Dry == 1){
            products.push({
                price: priceRange,
                skin: "Dry",
                count: 1
            })
        }
        if(+product.Oily == 1){
            products.push({
                price: priceRange,
                skin: "Oily",
                count: 1
            })
        }
        if(+product.Sensitive == 1){
            products.push({
                price: priceRange,
                skin: "Sensitive",
                count: 1
            })
        }
        if(+product.Combination == 1){
            products.push({
                price: priceRange,
                skin: "Combination",
                count: 1
            })
        }
        if(+product.Normal == 1){
            products.push({
                price: priceRange,
                skin: "Normal",
                count: 1
            })
        }
        
    })

    //groups products by price then skin type. sums up number of products in each group
    const aggregated = d3.rollups( 
        products,
        v => d3.sum(v, d => d.count),
        d => d.price,
        d => d.skin
    ).flatMap(([price, skinArr]) =>
        skinArr.map(([skin, count]) => ({ price, skin, count }))
    );

    // display the rectangles that make up the heat map
    svg.selectAll("rect")
      .data(aggregated)
      .enter()
      .append("rect")
      .attr("x", d => x(d.skin))
      .attr("y", d => y(d.price))
      .attr("width", x.bandwidth())
      .attr("height", y.bandwidth())
      .style("fill", d => myColor(d.count))
      .attr("stroke", "black")
      .attr("stroke-width", 0);

    // Legend dimensions
    const legendHeight = 150;
    const legendWidth = 15;

    // Define linear gradient (vertical)
    const defs = svg.append("defs");

    // display color gradient in legend
    const linearGradient = defs.append("linearGradient")
    .attr("id", "legend-gradient")
    .attr("x1", "0%")
    .attr("y1", "100%")
    .attr("x2", "0%")
    .attr("y2", "0%");

    linearGradient.selectAll("stop")
    .data([
        { offset: "0%", color: myColor(100) },
        { offset: "100%", color: myColor(300) }
    ])
    .enter().append("stop")
    .attr("offset", d => d.offset)
    .attr("stop-color", d => d.color);

    // display the legend scale
    svg.append("rect")
    .attr("x", width + 30)
    .attr("y", 10)
    .attr("width", legendWidth)
    .attr("height", legendHeight)
    .style("fill", "url(#legend-gradient)");

    // display labels for legend
    svg.append("text")
    .attr("x", width + 50)
    .attr("y", 20)
    .attr("text-anchor", "start")
    .style("font-size", "10px")
    .text("300+ Products");

    svg.append("text")
    .attr("x", width + 50)
    .attr("y", 10 + legendHeight)
    .attr("text-anchor", "start")
    .style("font-size", "10px")
    .text("< 100 Products");

}); 


