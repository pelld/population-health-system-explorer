// ============================================================
// 00. OVERNIGHT BED AVAILABILITY AND OCCUPANCY PATHWAY
// ============================================================
// Adds the 2024-25 KH03 provider measures. Quarterly figures are average daily
// beds; the annual values are day-weighted averages, not sums of quarterly stocks.

(() => {
  const nodes = [
    AE_NODE("available-overnight-beds","General and acute beds available overnight","hospital",2,112,990,{
      summary:"The average daily number of general and acute overnight beds recorded as available for use during 2024-25.",
      why:"Available staffed capacity constrains how admission volume and length of stay translate into occupancy and hospital flow pressure.",
      action:"Compare provider capacity with occupied beds, admission volume, length of stay and discharge constraints.",
      timescale:"medium", owner:"NHS providers and NHS England",
      measures:"Average daily available general and acute overnight beds; quarterly trend; other bed sectors.",
      caution:"Available beds are a provider measure and do not describe resident ICB capacity or whether every bed was clinically suitable for each patient.", evidence:"official", sources:["S24"]
    }),
    AE_NODE("occupied-overnight-beds","General and acute beds occupied overnight","hospital",2,128,1120,{
      summary:"The average daily number of general and acute overnight beds occupied during 2024-25.",
      why:"Occupied beds reflect admissions, length of stay, discharge timing, case mix and the amount of available capacity.",
      action:"Review occupied and available beds together; do not interpret raw occupied-bed counts without provider size and role.",
      timescale:"quick", owner:"NHS providers and NHS England",
      measures:"Average daily occupied general and acute overnight beds; quarterly trend and occupancy percentage.",
      caution:"This is an average daily stock, not a count of admissions, people or annual bed-days.", evidence:"official", sources:["S24"]
    }),
    AE_NODE("overnight-bed-occupancy","General and acute overnight-bed occupancy","hospital",2,144,990,{
      summary:"The percentage of available general and acute overnight beds that were occupied, based on the four published 2024-25 quarters.",
      why:"Occupancy rises when occupied bed demand increases relative to available capacity and can reduce operational resilience.",
      action:"Compare occupancy with admission volume, length of stay, delayed discharge, capacity changes and provider type.",
      timescale:"quick", owner:"NHS providers, ICBs and NHS England",
      measures:"Occupied beds divided by available beds; quarterly occupancy and sector profile.",
      caution:"A higher or lower occupancy rate is not a standalone performance judgement and is not adjusted for case mix, specialist role or seasonal configuration.", evidence:"official", sources:["S24"]
    })
  ];

  nodes.forEach(node => {
    if (!AE_MAP_NODES.some(existing => existing.id === node.id)) AE_MAP_NODES.push(node);
  });

  const requiredPairs = new Set([
    "hes-bed-days>occupied-overnight-beds",
    "available-overnight-beds>overnight-bed-occupancy",
    "occupied-overnight-beds>overnight-bed-occupancy",
    "overnight-bed-occupancy>hospital-flow-pressure",
    "hes-mean-los>occupied-overnight-beds",
    "delayed-discharge>occupied-overnight-beds"
  ]);

  for (let index = AE_MAP_LINKS.length - 1; index >= 0; index -= 1) {
    const link = AE_MAP_LINKS[index];
    if (requiredPairs.has(`${link.source}>${link.target}`)) AE_MAP_LINKS.splice(index,1);
  }

  AE_MAP_LINKS.push(
    AE_LINK("hes-bed-days","occupied-overnight-beds","provides a related but differently defined annual bed-use measure","uncertain","gap",["S23","S24"]),
    AE_LINK("available-overnight-beds","overnight-bed-occupancy","forms the occupancy denominator","negative","official",["S24"]),
    AE_LINK("occupied-overnight-beds","overnight-bed-occupancy","forms the occupancy numerator","positive","official",["S24"]),
    AE_LINK("overnight-bed-occupancy","hospital-flow-pressure","describes pressure on recorded overnight capacity","positive","official",["S24"]),
    AE_LINK("hes-mean-los","occupied-overnight-beds","longer stays can increase the occupied-bed stock","positive","hypothesis",["S23","S24"]),
    AE_LINK("delayed-discharge","occupied-overnight-beds","patients remaining in hospital can sustain occupancy","positive","hypothesis",["S24"])
  );
})();
