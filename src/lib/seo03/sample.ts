/**
 * Synthetic, anonymized sample in the shape of two GSC "Pages" exports
 * (period A = older, period B = newer) for the fictional shop
 * eshop-priklad.sk. Identical to __fixtures__/sample-period-{a,b}.csv from the
 * UX spec. Not real client data.
 */
export const SAMPLE_LABEL = "Ukážkové dáta";
export const SAMPLE_FILE_NAMES = { a: "ukazka-obdobie-a.csv", b: "ukazka-obdobie-b.csv" } as const;

export const SAMPLE_PERIOD_A_CSV = `\uFEFFTop pages
Start date: 2026-05-26
End date: 2026-08-23
Page,Clicks,Impressions,CTR,Position
https://eshop-priklad.sk/produkty/bezdratove-sluchadla,1840,62400,2.95%,6.2
https://eshop-priklad.sk/kategoria/smartfony,2210,48100,4.59%,4.1
https://eshop-priklad.sk/blog/ako-vybrat-notebook,640,22000,2.91%,8.4
https://eshop-priklad.sk/,3900,120000,3.25%,3.2
https://eshop-priklad.sk/kategoria/sluchadla,980,27500,3.56%,7.1
https://eshop-priklad.sk/produkty/obal-na-telefon,410,18400,2.23%,11.4
https://eshop-priklad.sk/blog/porovnanie-android-vs-ios,280,15200,1.84%,9.6
https://eshop-priklad.sk/doprava-a-vratky,150,8900,1.69%,12.8
https://eshop-priklad.sk/produkty/powerbanka-20w,520,19800,2.63%,8.9

https://eshop-priklad.sk/akcie/letny-vypredaj,710,24100,2.95%,6.8
`;

export const SAMPLE_PERIOD_B_CSV = `\uFEFFTop pages
Start date: 2026-08-24
End date: 2026-11-21
Page,Clicks,Impressions,CTR,Position
https://eshop-priklad.sk/produkty/bezdratove-sluchadla,980,61200,1.60%,6.5
https://eshop-priklad.sk/kategoria/smartfony,1420,31800,4.47%,9.8
https://eshop-priklad.sk/blog/ako-vybrat-notebook,210,19400,1.08%,14.2
https://eshop-priklad.sk/,4120,125400,3.29%,3.0
https://eshop-priklad.sk/kategoria/sluchadla,1010,28000,3.61%,6.9
https://eshop-priklad.sk/produkty/obal-na-telefon,440,19100,2.30%,10.8
https://eshop-priklad.sk/blog/porovnanie-android-vs-ios,265,14800,1.79%,9.8
https://eshop-priklad.sk/doprava-a-vratky,160,9100,1.76%,12.1
https://eshop-priklad.sk/produkty/powerbanka-20w,610,21400,2.85%,7.6
https://eshop-priklad.sk/akcie/cierny-piatok,880,30500,2.89%,5.4
`;
