import { ChartDto, data, Column } from "./chart_data";
import { repeat } from "./utils";
import { ComponentType, componentMixin, createElement, render } from "./reconciler";
import { prepareData } from "./prepareData";
import { App, AppProps } from "./app";

interface WrapperState {
  data: ChartDto;
  zoomedData: ChartDto;
  zoomed: boolean;
  zoomedOn: number;
  needToAnimate: boolean;
}

export const patchData = (data: ChartDto, length, timestamp, is?) => {
  const startIndex = data.columns[0].findIndex(v => v === timestamp);
  data.columns.forEach(c =>
    c.splice(startIndex, is ? length : 0, ...repeat(length, c[startIndex]))
  );
  return data;
};

export const cleanData = (data: ChartDto, length, timestamp) => {
  const startIndex = data.columns[0].findIndex(v => v === timestamp);
  data.columns.forEach(c => c.splice(startIndex, length));
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
  ) as Column[];
  return {
    ...data,
    columns: nextColumns
  };
};
const AppWrapper: ComponentType = () => ({
  ...componentMixin(),
  state: {
    data: null,
    zoomed: false,
    zoomedData: null,
    zoomedOn: null,
    needToAnimate: null
  } as WrapperState,
  reducer({ type, payload: { data, timestamp } }, prevState: WrapperState): WrapperState {
    switch (type) {
      case "zoom":
        return {
          data: patchData(this.props.data[this.props.index], data.columns[0].length, timestamp),
          zoomedData: data,
          zoomed: true,
          zoomedOn: timestamp,
          needToAnimate: true
        };
      case "zoom2":
        return {
          ...prevState,
          needToAnimate: false,
          data: patchData2(
            this.props.data[this.props.index],
            prevState.zoomedData,
            prevState.zoomedOn
          )
        };
      case "unzoom":
        return {
          ...prevState,
          data: patchData(
            this.props.data[this.props.index],
            prevState.zoomedData.columns[0].length,
            prevState.zoomedOn,
            true
          ),
          zoomed: false,
          needToAnimate: true
        };
      case "unzoom2":
        return {
          ...prevState,
          data: cleanData(
            this.props.data[this.props.index],
            prevState.zoomedData.columns[0].length,
            prevState.zoomedOn
          ),
          needToAnimate: false
        };
    }
  },
  getDeriviedStateFromProps(props, prevState) {
    if (!prevState.data) return { data: props.data[props.index] };
  },
  didUpdate() {
    if (this.state.needToAnimate) {
      if (this.state.zoomed) {
        setTimeout(() => {
          this.send({ type: "zoom2", payload: {} });
        }, 10);
      } else {
        setTimeout(() => {
          this.send({ type: "unzoom2", payload: {} });
        }, 500);
      }
    }
  },
  render(props, state: WrapperState) {
    return createElement(App, {
      ...prepareData(state.data, props.index),
      zoomed: state.zoomed,
      onZoom: this.zoom.bind(this),
      onUnzoom: this.unzoom.bind(this)
    } as AppProps);
  },
  unzoom() {
    this.send({ type: "unzoom", payload: {} });
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
    createElement("div", {}, [,
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
