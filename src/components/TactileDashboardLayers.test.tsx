import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TactileKpiSlider } from "./TactileKpiSlider";
import { TactileSegmentedBar } from "./TactileSegmentedBar";
import { LaserBorderCard } from "./LaserBorderCard";

describe("Tactile Dashboard Layer Components", () => {
  it("renders TactileKpiSlider with 3 slides and pagination controls", () => {
    const slides = [
      {
        id: "1",
        title: "Kliknutia",
        value: "340",
        badge: { text: "+204%", isPositive: true },
      },
      {
        id: "2",
        title: "Impresie",
        value: "12,450",
        badge: { text: "+15%", isPositive: true },
      },
      {
        id: "3",
        title: "Health",
        value: "94/100",
        badge: { text: "0 kritických", isPositive: true },
      },
    ];

    const html = renderToStaticMarkup(<TactileKpiSlider slides={slides} />);
    expect(html).toContain("340");
    expect(html).toContain("+204%");
    expect(html).toContain("Kliknutia");
    expect(html).toContain("Prejsť na slide 1");
    expect(html).toContain("Prejsť na slide 2");
    expect(html).toContain("Prejsť na slide 3");
  });

  it("renders TactileSegmentedBar with 3 tabs", () => {
    const html = renderToStaticMarkup(
      <TactileSegmentedBar activeTab="dashboard" onTabChange={() => {}} />,
    );
    expect(html).toContain("Dashboard");
    expect(html).toContain("Status");
    expect(html).toContain("Projects");
  });

  it("renders LaserBorderCard with children", () => {
    const html = renderToStaticMarkup(
      <LaserBorderCard>
        <span>Test Content</span>
      </LaserBorderCard>,
    );
    expect(html).toContain("Test Content");
  });
});
