// store nodes selected by user
const selectedNodes = new Set();

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
        // determine if product has SPF    
        d.hasSPF = d.Name && d.Name.toUpperCase().includes("SPF") ? "Has SPF" : "No SPF";
        // determine product's skin types
        d.skinType = [];

        if(+d.Combination == 1){
            d.skinType.push("Combination");
        }
        if(+d.Normal == 1){
            d.skinType.push("Normal");
        }
        if(+d.Dry == 1){
            d.skinType.push("Dry");
        }
        if(+d.Oily == 1){
            d.skinType.push("Oily");
        }
        if(+d.Sensitive == 1){
            d.skinType.push("Sensitive");
        }

    });

    const priceRanges = ["<= $25", "$25-50", "$50-75", "$75-100", "$100+"];

    // node names for labels in the alluvial map
    const nodeNames = Array.from(new Set ([
        ...rawData.map(d => d.Rank.toString()),
        ...priceRanges,
        "Has SPF", "No SPF",
        "Sensitive", "Dry", "Normal", "Combination", "Oily"
    ]));

    const nodeIndex = new Map(nodeNames.map((name, i) => [name, i]));
    const nodes = nodeNames.map(name => ({name}));

    const linkCount = {};

//----------PROCESS RAW DATA AND ESTABLISH LINKS:------------
    
    rawData.forEach(d => {
        // link SPF to skin type
        d.skinType.forEach(p => {
            const key1 = `${d.hasSPF}->${p}`;
            linkCount[key1] = (linkCount[key1] || 0) + 1;
        })

        // link skin type to product type
        d.skinType.forEach(p => {
            const key2 = `${p}->${d.Rank}`;
            linkCount[key2] = (linkCount[key2] || 0) + 1;
        })

        // link product type -> price
        const key3 = `${d.Rank}->${d.priceRange}`;
        linkCount[key3] = (linkCount[key3] || 0) + 1;
    })

    const links = Object.entries(linkCount).map(([key, value]) => {
        const [source, target] = key.split("->").map(s => s.trim());
        return {
            source: nodeIndex.get(source),
            target: nodeIndex.get(target),
            value
        };
    });
// -----------END OF ESTABLISHING LINKS----------------
    //establish ascending order of price range nodes 
    const priceOrder = {
        "<= $25": 0,
        "$25-50": 1,
        "$50-75": 2,
        "$75-100": 3,
        "$100+": 4
    };

    const sankeyData = {nodes, links};

    // set margins, width, and height
    const margin = {top: 60, right: 50, bottom: 0, left: 20},
      width = 850 - margin.left - margin.right,
      height = 620 - margin.top - margin.bottom;
    
    //set colors for each node
    const categoryColors = {
        // Skin Types
        "Sensitive": "#800080",
        "Dry": "#1E90FF",
        "Normal": "#228B22",
        "Combination": "#FF8C00",
        "Oily": "#bc4749",

        // SPF
        "Has SPF": "#735751",
        "No SPF": "#b69121",

        // Price Ranges
        "<= $25": "#93a3ad",     
        "$25-50": "#90e0ef",      
        "$50-75": "#2c8c99",     
        "$75-100": "#326771",    
        "$100+": "#28464b",

        // Ratings
        "Poor": "#8f2d56", 
        "Good": "#fdc500",
        "Great": "#218380",
    };

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
        .extent([[1, 1], [width - 1, height - 6]])
        .nodeSort((a, b) => {
            // Force price range nodes to sort by defined order
            if (priceOrder[a.name] !== undefined && priceOrder[b.name] !== undefined) {
                return priceOrder[a.name] - priceOrder[b.name];
            }
        });
    // runs sankey layout template on my data
    const graph = sankey(sankeyData);
    
    // Render Links
    const linkSelection = chart.append("g")
        .selectAll("path")
        .data(graph.links)
        .join("path")
        .attr("class", "link")
        .attr("d", d3.sankeyLinkHorizontal())
        .attr("fill", "none")
        .attr("stroke", d => categoryColors[d.source.name])
        .attr("stroke-width", d => Math.max(1, d.width));
    // Nodes
    const nodeGroup = chart.append("g")
        .selectAll("g")
        .data(graph.nodes)
        .join("g")
        .on("click", function(event, d) {
            const isSelected = selectedNodes.has(d.name);
            if (isSelected) {
                selectedNodes.delete(d.name);
            } else {
                selectedNodes.add(d.name);
            }
            updateSelected();
        });

    nodeGroup.append("rect")
        .attr("x", d => d.x0)
        .attr("y", d => d.y0)
        .attr("height", d => d.y1 - d.y0)
        .attr("width", d => d.x1 - d.x0)
        .attr("fill", d => categoryColors[d.name] || "#ccc");

    nodeGroup.append("text")
        .attr("x", d => d.x0 < width / 5 ? d.x0 + 23 : d.x0 - 5)
        .attr("y", d => (d.y1 + d.y0) / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", d => d.x0 < width / 5 ? "start" : "end")
        .text(d => d.name);

// ---------- LABELS FOR CATEGORIES------------
    // display label for spf column
    svg.append("text")
        .attr("x", 20)
        .attr("y", 55)
        .text("SPF")
        .attr("text-anchor", "start")
        .style("font-weight", "bold");

    // display label for skin type column
    svg.append("text")
    .attr("x", (width / 3) + 30)
    .attr("y", 55)
    .text("Skin Type")
    .attr("text-anchor", "middle")
    .style("font-weight", "bold");

    // display label for rating column
    svg.append("text")
        .attr("x", (width/2)+(width/5)+20)
        .attr("y", 55)
        .text("Rating")
        .attr("text-anchor", "end")
        .style("font-weight", "bold");

    // display label for price range column
    svg.append("text")
        .attr("x", width+20)
        .attr("y", 55)
        .text("Price Range")
        .attr("text-anchor", "end")
        .style("font-weight", "bold");
// ----------END OF LABELS FOR CATEGORIES------------
    function updateSelected() {
        linkSelection
            .classed("highlight", d => selectedNodes.has(d.source.name) || selectedNodes.has(d.target.name))
            .classed("hidden", d => !selectedNodes.has(d.source.name) && !selectedNodes.has(d.target.name));
    }

    window.allNodes = nodes.map(d => d.name);
    window.updateSelected = updateSelected;
    // select all nodes to highlight all connections
    function selectAll(){
        allNodes.forEach(name => selectedNodes.add(name));
        updateSelected();
    }
    // unselect all nodes
    function unselectAll(){
        selectedNodes.clear();
        updateSelected();
    }
    // listen to when user clicks on buttons
    document.querySelector('button[value="selectAll"]').addEventListener("click", selectAll);
    document.querySelector('button[value="unselectAll"]').addEventListener("click", unselectAll);
});