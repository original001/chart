import { mergeChildMappings, getNextChildMapping, getChildMapping } from "../src/childmapping";
import { createElement } from "../src/reconciler";

describe("mapping", () => {
  it("simple merge", () => {
    const childMappings = mergeChildMappings(
      { "1": createElement("g", {}), "2": createElement("g", {}) },
      { "2": createElement("span", {}) }
    );
    expect(childMappings["2"].element).toBe("span");
  });
  it("get child mapping", () => {
    const nextElement = createElement("g", {}, [
      createElement("span", { key: "1" }),
      createElement("span", { key: "2" })
    ]);
    const mapping = getChildMapping(nextElement.props.children)
    expect(mapping['2'].element).toBe('span')
  })
  it("next child mapping", () => {
    const nextElement = createElement("g", {}, [
      createElement("span", { key: "1", in: true }),
      createElement("span", { key: "2", in: true })
    ]);
    const nextMapping = getNextChildMapping(nextElement.props.children, {
      "1": createElement("span", { key: "1" }),
      "2": createElement("g", { key: "2" })
    });

    expect(nextMapping['2'].element).toBe('span');
    // expect(nextMapping).toBe({});
  });
  it("next child mapping 2", () => {
    const nextElement = createElement("g", {}, [
      createElement("span", { key: "2" }),
      createElement("span", { key: "3" })
    ]);
    const nextMapping = getNextChildMapping(nextElement.props.children, {
      "1": createElement("g", { key: "1", in: true }),
      "2": createElement("g", { key: "2", in: true }),
      "3": createElement("g", { key: "3", in: true })
    });

    expect(nextMapping['1'].props.in).toBe(false);
    expect(nextMapping['2'].props.in).toBe(true);
    // expect(nextMapping).toBe({});
  });
});
