/* Insights:
 	Are certain product types more expensive? 
        Unclear, but cleansers and face masks are on lower side of price range.
	Are more expensive products rated better? 
        Majority of products that are rated "Great" are within $50.
        There are less products in the more expensive price ranges but an 
        overwhelming majority of products in the more expensive price ranges are 
        rated "Great" 
*/	

// read and process data
d3.csv("cosmetics.csv").then(rawData => {
    // go through each product...
    rawData.forEach(d => {
        // determine price range product belongs in 
        d.priceRange = 
                    +d.Price <= 25 ? "<= $25" :
                    +d.Price <= 50 ? "$25-50" :
                    +d.Price <= 75 ? "$50-75" :
                    +d.Price <= 100 ? "$75-100" :
                    "$100+";
        // determine product rating based on numerical rating
        d.Rank = 
            +d.Rank <= 3 ? "Poor" :
            +d.Rank <= 4 ? "Good" :
            "Great";
    });

    const priceRanges = ["<= $25", "$25-50", "$50-75", "$75-100", "$100+"];

    const nodeNames = Array.from(new Set ([
        ...rawData.map(d => d["Label"]),
        ...rawData.map(d => d.Rank.toString()),
        ...priceRanges
    ]));

    const nodeIndex = new Map(nodeNames.map((name, i) => [name, i]));
    const nodes = nodeNames.map(name => ({name}));

    const linkCount = {};
    
    // link product type -> price
    rawData.forEach(d => {
        const key = `${d["Label"]}->${d.priceRange}`;
        linkCount[key] = (linkCount[key] || 0) + 1;
    })

    // link price -> rank
    rawData.forEach(d => {
        const key = `${d.priceRange}->${d.Rank}`;
        linkCount[key] = (linkCount[key] || 0) + 1;
    })
    
    const links = Object.entries(linkCount).map(([key, value]) => {
        const [source, target] = key.split("->").map(s => s.trim());
        return {
            source: nodeIndex.get(source),
            target: nodeIndex.get(target),
            value
        };
    });

    const sankeyData = {nodes, links};

    const margin = {top: 60, right: 50, bottom: 0, left: 20},
      width = 600 - margin.left - margin.right,
      height = 500 - margin.top - margin.bottom;

    // select sankey svg in html file
    const svg = d3.select("#sankey")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom);
        
    // display title
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", 20)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .text("Relationship Between Price, Product Type, and Product Rating");

    const chart = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // create sankey layout
    const sankey = d3.sankey()
        .nodeWidth(20)
        .nodePadding(10)
        .extent([[1, 1], [width - 1, height - 6]]);
    
    // runs sankey layout template on my data
    const graph = sankey(sankeyData);

    // create color scale for links
    const colorScale = d3.scaleLinear()
        .domain(d3.extent(graph.links, d => d.value))
        .range(["#add8e6", "#00008b"]);
    
    // Links
    chart.append("g")
        .selectAll("path")
        .data(graph.links)
        .join("path")
        .attr("d", d3.sankeyLinkHorizontal())
        .attr("fill", "none")
        .attr("stroke", d => colorScale(d.value))
        .attr("stroke-opacity", 0.5)
        .attr("stroke-width", d => Math.max(1, d.width));

    // Nodes
    const node = chart.append("g")
        .selectAll("g")
        .data(graph.nodes)
        .join("g");

    //  display nodes
    node.append("rect")
        .attr("x", d => d.x0)
        .attr("y", d => d.y0)
        .attr("height", d => d.y1 - d.y0)
        .attr("width", d => d.x1 - d.x0)
        .attr("fill", "steelblue");

    //  display node labels
    node.append("text")
        .attr("x", d => d.x0 - 6)
        .attr("y", d => (d.y1 + d.y0) / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", d => d.x0 < width / 3 ? "start" : "end")
        .text(d => d.name);
    
    // display label for leftmost column
    svg.append("text")
        .attr("x", 20)
        .attr("y", 55)
        .text("Product Type")
        .attr("text-anchor", "start")
        .style("font-weight", "bold");

    // display label for middle column
    svg.append("text")
    .attr("x", (width / 2) + 20)
    .attr("y", 55)
    .text("Price Range")
    .attr("text-anchor", "middle")
    .style("font-weight", "bold");

    // display label for rightmost column
    svg.append("text")
        .attr("x", width + 20)
        .attr("y", 55)
        .text("Rating")
        .attr("text-anchor", "end")
        .style("font-weight", "bold");
});
