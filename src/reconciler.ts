export type ComponentType = () => Component;
export interface Tree {
  host?: SVGElement;
  element: string | ComponentType;
  props: Props;
}

export interface Props {
  children?: Tree[];
}

export interface Component {
  _innerTree: Tree;
  state: {};
  props: Props;
  getDeriviedStateFromProps: (props, state) => {};
  didUpdate?: (self: Component) => void;
  didMount?: () => void;
  reducer?: (action, state) => {};
  render: (props, state) => Tree;
  send: (action: string) => void;
  host: Element;
}
const CHART_HEIGHT = 200;
const NS = "http://www.w3.org/2000/svg";

const ruler = (y, label) =>
  createElement("g", {}, [
    createElement("line", {
      x1: "0",
      y1: CHART_HEIGHT - y + ""
      // x2: "100%",
      // y2: CHART_HEIGHT - y + "",
      // "stroke-width": "1",
      // stroke: "gray" //need col,
    }),
    createElement("text", {
      // x: 0,
      // y: CHART_HEIGHT - y - 10 + "",
      // fill: "gray",
      caption: label
    })
  ]);

export const createElement = (
  element: string | ComponentType,
  props,
  children?
): Tree => {
  // if (children) {
  //   Object.defineProperty(props, "children", { enumerable: false });
  // }
  return {
    element,
    props: children
      ? {
          ...props,
          children
        }
      : props
  };
};

export const Ruller : ComponentType = () => ({
  state: {
    values: null,
    scale: null,
    status: "initial" as "update" | "ready" | "initial"
  },
  getDeriviedStateFromProps: (props, state) => {
    if (!state.values) return props;
    if (state.values !== props.values) {
      return {
        ...state,
        status: "update"
      };
    }
  },
  didUpdate() {
    setTimeout(() => {
      this.send("update");
    }, 300);
  },
  render: (props, state) => {
    return createElement(
      "g",
      {},
      props.values
        .slice(state.status === "ready" ? 1 : 0)
        .map(y => ruler((y - props.values[0]) * props.scale, state.status))
    );
  },
  reducer: (action, state) => {
    switch (action) {
      case "update":
        return { ...state, status: "ready" };
    }
  },
  props: null,
  host: null,
  _innerTree: null,
  send(action: string) {
    // console.log(this)
    this.state = this.reducer(action, this.state);
    updateComponent(this);
  }
});

export const render = (tree: Tree, container: Element) => {
  if (typeof tree.element === "string") {
    const el = document.createElementNS(NS, tree.element);
    tree.host = el;
    for (let caption in tree.props) {
      if (caption === "children") continue;
      el.setAttributeNS(null, caption, tree.props[caption]);
    }
    if (tree.props.children) {
      tree.props.children = tree.props.children.map(child => render(child, el));
    }
    container && container.append(el);
  } else {
    const renderedTree = renderComponent(tree);
    render(renderedTree, container);
  }
  return tree;
};

export const renderComponent = (tree: Tree) => {
  if (typeof tree.element === 'string') return tree;
  const comp = tree.element();
  comp.props = tree.props;
  const innerTree = comp.render(tree.props, comp.state);
  comp._innerTree = innerTree;
  return innerTree;
};

const updateChildren = (lastTree: Tree, nextTree: Tree) => {
  const { props: prevProps, host } = lastTree;
  const { props } = nextTree;
  if (lastTree.element !== nextTree.element) {
    //unmount
    render(nextTree, lastTree.host);
  }

  if (prevProps !== props) {
    for (let nextProp in props) {
      if (nextProp === "children") continue;
      if (
        prevProps[nextProp] == null ||
        prevProps[nextProp] !== props[nextProp]
      ) {
        host.setAttribute(nextProp, props[nextProp]);
      }
    }
  }
  if (props.children) {
    for (let child of props.children) {
      const childIndex = props.children.indexOf(child);
      const prevChild = prevProps.children[childIndex];
      if (!(prevProps.children && prevChild)) {
        render(child, host);
        continue;
      }
      if (child === prevChild) {
        continue;
      } else {
        updateChildren(prevChild, child);
      }
    }
    for (let prevChild of prevProps.children) {
      const prevChildIndex = prevProps.children.indexOf(prevChild);
      if (!props.children[prevChildIndex]) {
        host.removeChild(prevChild.host)
      }
    }
  }
};


export const updateComponent = (comp: Component) => {
  const nextTree = comp.render(comp.props, comp.state);
  updateChildren(comp._innerTree, nextTree);
  comp._innerTree = nextTree;
  comp.didUpdate(comp);
};
