export type ComponentType = () => Component;
export interface Tree {
  host?: Element;
  element: string | ComponentType;
  props: Props;
}

export interface Props {
  children?: Tree[];
}

export interface Component {
  _innerTree: Tree;
  state?: {};
  props?: Props;
  getDeriviedStateFromProps?: (props, state) => {};
  didUpdate?: (self: Component) => void;
  didMount?: () => void;
  reducer?: (action, state) => {};
  render: (props, state) => Tree;
  send: (action: Action) => void;
  host: Element;
}
const NS = "http://www.w3.org/2000/svg";

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

export interface Action {
  type: string;
  payload: {}
}

export const componentMixin = () => ({
  props: null,
  host: null,
  _innerTree: null,
  send(action: Action) {
    // console.log(this)
    this.state = this.reducer(action, this.state);
    updateComponent(this);
  }
});

export const render = (tree: Tree, container: Element) => {
  const type = tree.element;
  if (typeof type === "string") {
    const el = /div|span/.test(type)
      ? document.createElement(type)
      : document.createElementNS(NS, type);
    const children = tree.props.children;
    tree.host = el;
    for (let caption in tree.props) {
      if (caption === "children") continue;
      el.setAttributeNS(null, caption, tree.props[caption]);
    }
    if (children) {
      if (typeof children === "string") {
        el.textContent = children;
      } else {
        tree.props.children = tree.props.children.map(child =>
          render(child, el)
        );
      }
    }
    container && container.append(el);
  } else {
    const comp = type();
    comp.props = tree.props;
    const innerTree = comp.render(tree.props, comp.state);
    comp._innerTree = innerTree;
    render(innerTree, container);

    comp.didMount && comp.didMount();
  }
  return tree;
};

export const renderComponent = (tree: Tree) => {};

const updateChildren = (lastTree: Tree, nextTree: Tree) => {
  const { props: prevProps, host } = lastTree;
  const { props } = nextTree;
  if (lastTree.element !== nextTree.element) {
    //unmount
    render(nextTree, lastTree.host);
  }
  nextTree.host = host;

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
        //todo: prevchild shoud have host
        updateChildren(prevChild, child);
      }
    }
    for (let prevChild of prevProps.children) {
      const prevChildIndex = prevProps.children.indexOf(prevChild);
      if (!props.children[prevChildIndex]) {
        host.removeChild(prevChild.host);
      }
    }
  }
};

export const updateComponent = (comp: Component) => {
  //compare prevstate and next
  const nextTree = comp.render(comp.props, comp.state);
  updateChildren(comp._innerTree, nextTree);
  comp._innerTree = nextTree
  comp.didUpdate && comp.didUpdate(comp);
};
