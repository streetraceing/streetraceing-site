import { evaluateRegex, type RegexRequest } from '../../utils/regex-evaluator';

self.onmessage = (event: MessageEvent<RegexRequest>) => {
  self.postMessage(evaluateRegex(event.data));
};
