import { Tree } from "./reconciler";

export function mergeChildMappings(prev: ChildMapping, next: ChildMapping): ChildMapping {
  prev = prev || {}
  next = next || {}

  function getValueForKey(key) {
    return key in next ? next[key] : prev[key]
  }

  // For each key of `next`, the list of keys to insert before that key in
  // the combined list
  let nextKeysPending = Object.create(null)

  let pendingKeys = []
  for (let prevKey in prev) {
    if (prevKey in next) {
      if (pendingKeys.length) {
        nextKeysPending[prevKey] = pendingKeys
        pendingKeys = []
      }
    } else {
      pendingKeys.push(prevKey)
    }
  }

  let i
  let childMapping = {}
  for (let nextKey in next) {
    if (nextKeysPending[nextKey]) {
      for (i = 0; i < nextKeysPending[nextKey].length; i++) {
        let pendingNextKey = nextKeysPending[nextKey][i]
        childMapping[nextKeysPending[nextKey][i]] = getValueForKey(
          pendingNextKey
        )
      }
    }
    childMapping[nextKey] = getValueForKey(nextKey)
  }

  // Finally, add the keys which didn't appear before any key in `next`
  for (i = 0; i < pendingKeys.length; i++) {
    childMapping[pendingKeys[i]] = getValueForKey(pendingKeys[i])
  }

  return childMapping
}

export function getChildMapping(children: Tree[], mapFn?: (child: Tree) => Tree): ChildMapping {
  let mapper = child => (mapFn ? mapFn(child) : child)

  let result = Object.create(null)
  if (children)
  children.forEach(child => {
      // run the map function here instead so that the key is the computed one
      result[child.props.key] = mapper(child)
    })
  return result
}

export function getInitialChildMapping(children: Tree[]) {
  return getChildMapping(children, child => ({
    ...child,
    props: {
      ...child.props,
      in: true,
      status: 'enter'
    }
  }))
}
export interface ChildMapping {
  [key: string]: Tree
}

export function getNextChildMapping(nextChildren: Tree[], prevChildMapping: ChildMapping) {
  let nextChildMapping = getChildMapping(nextChildren)
  let children = mergeChildMappings(prevChildMapping, nextChildMapping)

  Object.keys(children).forEach(key => {
    let child = children[key]

    const hasPrev = key in prevChildMapping
    const hasNext = key in nextChildMapping

    const prevChild = prevChildMapping[key]
    const isLeaving = prevChild && !prevChild.props.in

    // console.log(hasPrev, hasNext, isLeaving)

    // item is new (entering)
    if (hasNext && (!hasPrev || isLeaving)) {
      // console.log('entering', key)
      children[key].props.in = true;
      children[key].props.status = 'appear';
    } else if (!hasNext && hasPrev && !isLeaving) {
      // item is old (exiting)
      // console.log('leaving', key)
      children[key].props.in = false;
    } else if (hasNext && hasPrev) {
      // item hasn't changed transition states
      // copy over the last transition props;
      // console.log('unchanged', key)
      children[key].props.in = prevChild.props.in
    }
  })

  return children
}