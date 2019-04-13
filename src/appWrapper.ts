import { ChartDto, data } from "./chart_data";
import { repeat } from "./utils";
import { ComponentType, componentMixin, createElement, render } from "./reconciler";
import { prepareData } from "./prepareData";
import { App } from "./app";

interface WrapperState {
  data: ChartDto;
  zoomedData: ChartDto;
  zoomed: boolean;
  zoomedOn: number;
}

export const patchData = (data: ChartDto, length, timestamp) => {
  const startIndex = data.columns[0].findIndex(v => v === timestamp);
  data.columns.forEach(c => c.splice(startIndex, 0, ...repeat(length, c[startIndex])));
  return data;
};
export const patchData2 = (data: ChartDto, nextData: ChartDto, timestamp) => {
  const startIndex = data.columns[0].findIndex(v => v === timestamp);
  const nextColumns = data.columns.map((c, ci) =>
    c.map((v, i, ar) =>
      i == 0
        ? v
        : i <= startIndex || i >= startIndex + nextData.columns[0].length - 1
        ? ci == 0
          ? i <= startIndex
            ? nextData.columns[ci][1]
            : nextData.columns[ci][nextData.columns[0].length - 1]
          : nextData.columns[ci][1]
        : nextData.columns[ci][i + 1 - startIndex]
    )
  );
  return {
    ...data,
    columns: nextColumns
  };
};
let firstUpdate = true;
const AppWrapper: ComponentType = () => ({
  ...componentMixin(),
  state: {
    data: null,
    zoomed: false,
    zoomedData: null,
    zoomedOn: null
  } as WrapperState,
  reducer({ type, payload: { data, timestamp } }, prevState: WrapperState): WrapperState {
    switch (type) {
      case "zoom":
        return {
          data: patchData(this.props.data[this.props.index], data.columns[0].length, timestamp),
          zoomedData: data,
          zoomed: true,
          zoomedOn: timestamp
        };
      case "zoom2":
        return {
          ...prevState,
          data: patchData2(
            this.props.data[this.props.index],
            prevState.zoomedData,
            prevState.zoomedOn
          )
        };
    }
  },
  getDeriviedStateFromProps(props, prevState) {
    if (!prevState.data) return { data: props.data[props.index] };
  },
  didUpdate(prevProps, prevState) {
    if (firstUpdate) {
      firstUpdate = false;
      setTimeout(() => {
        this.send({ type: "zoom2", payload: {} });
      }, 10);
    }
  },
  render(props, state) {
    return createElement(App, prepareData(state.data, this.zoom.bind(this), state.zoomed, props.index));
  },
  zoom(timestamp) {
    const [year, month, day] = new Date(timestamp)
      .toISOString()
      .split("T")[0]
      .split("-");
    const request = `data/${this.props.index + 1}/${year}-${month}/${day}.json`;
    fetch(request)
      .then(data => {
        return data.json();
      })
      .then(data => {
        this.send({ type: "zoom", payload: { data, timestamp } });
      });
  }
});

const start = () => {
  render(
    createElement("div", {}, [
      createElement(AppWrapper, { data, index: 0 }),
      createElement(AppWrapper, { data, index: 1 }),
      createElement(AppWrapper, { data, index: 2 }),
      createElement(AppWrapper, { data, index: 3 }),
      createElement(AppWrapper, { data, index: 4 })
      // createElement(Benchmark, { id: 1 }),
      // createElement(Benchmark, { id: 2 })
    ]),
    document.getElementById("main")
  );
};

window["start"] = start;
