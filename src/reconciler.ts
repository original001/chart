export type ComponentType = () => Component;
export interface Tree {
  _instance?: Component;
  host?: Element;
  element: string | ComponentType;
  props: Props;
}

export interface Props {
  children?: Tree[];
  [key: string]: any;
}

export interface Component {
  _innerTree: Tree;
  state?: {};
  props?: Props;
  getDeriviedStateFromProps?: (props, state) => {};
  shouldUpdate?: (nextProps) => boolean;
  didUpdate?: (prevProps: Props, prevState) => void;
  didMount?: () => void;
  willRemove?: (onRemove, host) => void;
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
  payload?: {};
}

export const componentMixin = () => ({
  props: null,
  host: null,
  _innerTree: null,
  send(action: Action) {
    // console.log(action)
    const nextState = this.reducer(action, this.state);
    // console.log(nextState)
    updateComponentBySelf(this, nextState);
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
    const innerTree = renderComponent(comp, tree.props);
    comp._innerTree = innerTree;
    tree.host = container;
    tree._instance = comp;
    render(innerTree, container);
    comp.didMount && comp.didMount();
  }
  return tree;
};

export const renderComponent = (comp: Component, props, state?) => {
  let derivedState = state || comp.state;
  if (!state && comp.getDeriviedStateFromProps) {
    derivedState = comp.getDeriviedStateFromProps(props, comp.state);
  }
  comp.state = derivedState;
  return comp.render(props, derivedState);
};

export const updateChildren = (lastTree: Tree, nextTree: Tree) => {
  const { props: prevProps, host } = lastTree;
  const { props } = nextTree;

  if (lastTree.element !== nextTree.element) {
    //unmount
    render(nextTree, host.parentElement);
    host.parentElement.removeChild(host);
    return;
  }

  if (typeof nextTree.element === "function") {
    updateComponentByParent(lastTree._instance, nextTree.props);
    nextTree.host = host;
    nextTree._instance = lastTree._instance;
    return;
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
  if (!props.children && prevProps.children) {
    for (let child of prevProps.children) {
      host.removeChild(child.host);
    }
    return;
  }

  if (props.children) {
    if (typeof props.children === "string") {
      host.textContent = props.children;
      return;
    }
    if (!prevProps.children) {
      for (let child of props.children) {
        render(child, host);
      }
      return;
    }
    for (let child of props.children) {
      const childIndex = props.children.indexOf(child);
      const prevChild = prevProps.children && prevProps.children[childIndex];
      if (!(prevProps.children && prevChild)) {
        render(child, host);
        continue;
      }

      //todo: prevchild shoud have host
      updateChildren(prevChild, child);
    }
    for (let prevChild of prevProps.children) {
      const prevChildIndex = prevProps.children.indexOf(prevChild);
      if (!props.children[prevChildIndex]) {
        host.removeChild(prevChild.host);
      }
    }
  }
};

export const updateComponent = (comp: Component, nextProps, nextState?) => {
  //compare prevstate and next
  const prevState = comp.state;
  const prevProps = comp.props;

  if (nextState) {
    comp.state = nextState;
  }
  comp.props = nextProps;
  const nextTree = renderComponent(comp, nextProps, nextState);
  updateChildren(comp._innerTree, nextTree);
  comp._innerTree = nextTree;
  comp.didUpdate && comp.didUpdate(prevProps, prevState || comp.state);
};

export const updateComponentBySelf = (comp: Component, nextState) => {
  //compare prevstate and next
  const prevState = comp.state;
  const prevProps = comp.props;

  const nextTree = renderComponent(comp, prevProps, nextState);
  updateChildren(comp._innerTree, nextTree);
  comp._innerTree = nextTree;
  comp.didUpdate && comp.didUpdate(prevProps, prevState);
};

export const updateComponentByParent = (comp: Component, nextProps) => {
  //compare prevstate and next
  const prevState = comp.state;
  const prevProps = comp.props;

  // if (comp.shouldUpdate && !comp.shouldUpdate(nextProps)) return;
  comp.props = nextProps;
  const nextTree = renderComponent(comp, nextProps);
  // console.log(nextTree)
  updateChildren(comp._innerTree, nextTree);
  comp._innerTree = nextTree;
  comp.didUpdate && comp.didUpdate(prevProps, prevState);
};
