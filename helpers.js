function rgbToLum(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  return r * 0.2126 + g * 0.7152 + b * 0.0722;
}

function arrToColor(r, g, b, a) {
  if (typeof a !== 'undefined')
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  return `rgb(${r}, ${g}, ${b})`;
}

function classSet(className, properties, propval) {
  const elems = document.getElementsByClassName(className);
  for (let i = 0; i < elems.length; i++) {
    if (typeof propval === 'string')
      elems[i].style[properties] = propval;
    else {
      for (prop in properties) {
        if (properties.hasOwnProperty(prop))
          elems[i].style[prop] = properties[prop];
      }
    }
  }
}

function max(a, b) {
  return a > b ? a : b;
}

function min(a, b) {
  return a > b ? b : a;
}

function simplify(word) {
  word = word.toLowerCase();
  word = word.replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss');
  word = word.replace(/é/g, 'e').replace(/è/g, 'e').replace(/ê/g, 'e').replace(/á/g, 'a');
  word = word.replace(/à/g, 'a').replace(/â/g, 'a').replace(/ô/g, 'o').replace(/î/g, 'i');
  word = word.replace(/ù/g, 'u').replace(/û/g, 'u').replace(/ë/g, 'e').replace(/ï/g, 'i');
  word = word.replace(/ç/g, 'c').replace(/œ/g, 'oe').replace(/æ/g, 'ae');
  return word;
}

function escapeHtml(word) {
  return word.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;').replace(/ /g, '&nbsp;')
    .replace(/\r?\n/g, '&#8203;<br />&#8203;');
}

function escapePlainHtml(word) {
  return `${word || ''}`.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function lcs(stra, strb) {
  const l = [];
  for (let i = 0; i <= stra.length; i++) {
    l[i] = [];
    for (let j = 0; j <= strb.length; j++)
      l[i][j] = [0, 0, 0];
  }
  for (let i = 0; i <= stra.length; i++) {
    for (let j = 0; j <= strb.length; j++) {
      if (i == 0 || j == 0) l[i][j] = [-1, -1, 0];
      else if (stra[i - 1] == strb[j - 1]) l[i][j] = [i - 1, j - 1, l[i - 1][j - 1][2] + 1];
      else {
        if (l[i - 1][j][2] > l[i][j - 1][2])
          l[i][j] = [i - 1, j, l[i - 1][j][2]];
        else
          l[i][j] = [i, j - 1, l[i][j - 1][2]];
      }
    }
  }
  let res = '';
  let i = stra.length, j = strb.length;
  let cur = l[i][j];
  while (cur[2] > 0) {
    if (cur[0] < i && cur[1] < j) res = stra[ cur[0] ] + res;
    i = cur[0]; j = cur[1];
    cur = l[i][j];
  }
  return res;
}

function cmpScore(stra, strb) {
  const maxlen = max(stra.length, strb.length);
  const lenfac = (maxlen < 4) ? Math.sqrt(maxlen / 4) : 1;
  if (stra == strb) return lenfac * 1;
  if (stra.length < strb.length)
    [stra, strb] = [strb, stra];
  if (stra.includes(strb)) return lenfac * strb.length / stra.length;
  const lcstr = lcs(stra, strb);
  const fac = stra.includes(lcstr) ? (strb.includes(lcstr) ? 1 : 0.9) : (strb.includes(lcstr) ? 0.9 : 0.8);
  return lenfac * fac * lcstr.length / stra.length;
}

function splitResult(result) {
  const regex = /[\x00-\x2f\x3a-\x40\x5b-\x60\x7b-\xbf\xd7\xf7]+/gm;
  const res = result.split(regex);
  for (let i = res.length - 1; i >= 0; i--) {
    res[i] = simplify(res[i]);
    if (res[i] == '')
      res.splice(i, 1);
  }
  return res;
}

function ceilIndex(tail, l, r, val) {
  while (r - l > 1) {
    m = l + Math.floor((r - l) / 2);
    if (val <= tail[m]) r = m;
    else l = m;
  }
  return r;
}

function lis(seq) {
  if (seq.length == 0) return [];
  let tail = []; let idxTail = []; let p = []; let length = 1;
  for (let i = 0; i < seq.length; i++) {
    tail.push(0); idxTail.push(0); p.push(-1);
  }
  tail[0] = seq[0]; idxTail[0] = 0; p[0] = -1;
  for (let i = 1; i < seq.length; i++) {
    if (seq[i] < tail[0]) {
      tail[0] = seq[i]; idxTail[0] = i; p[i] = -1;
    } else if (seq[i] > tail[length - 1]) {
      tail[length++] = seq[i]; idxTail[length - 1] = i; p[i] = idxTail[length - 2];
    } else {
      const ci = ceilIndex(tail, -1, length - 1, seq[i]);
      tail[ci] = seq[i]; idxTail[ci] = i; p[i] = ci > 0 ? idxTail[ci - 1] : -1;
    }
  }
  let res = []; let cpos = idxTail[length - 1];
  while (cpos >= 0) { res.push(cpos); cpos = p[cpos]; }
  res.reverse();
  if (res.length != length) throw new Error('fatal');
  return res;
}

function matchText(recText, currentPosition, currentRecording, speechPosition, currentMatchArray) {
  let newPosition = currentPosition;
  if (speechPosition > currentRecording.length) {
    newPosition -= speechPosition - currentRecording.length;
    speechPosition = currentRecording.length;
  }

  const mWord = i => currentMatchArray[i][0];
  const setWord = (i, val) => {
    currentMatchArray[i][0] = val;
  };
  const firstIdx = (i, val) => {
    if (typeof val === 'undefined') return currentMatchArray[i][1][0];
    currentMatchArray[i][1][0] = val;
  };
  const firstScore = (i, val) => {
    if (typeof val === 'undefined') return currentMatchArray[i][1][1];
    currentMatchArray[i][1][1] = val;
  };
  const secondIdx = (i, val) => {
    if (typeof val === 'undefined') return currentMatchArray[i][2][0];
    currentMatchArray[i][2][0] = val;
  };
  const secondScore = (i, val) => {
    if (typeof val === 'undefined') return currentMatchArray[i][2][1];
    currentMatchArray[i][2][1] = val;
  };
  const bestScore = i => max(firstScore(i), secondScore(i));

  let maxScore = -1;
  for (let i = max(0, speechPosition - 10); i < currentRecording.length; i++) {
    while (i >= currentMatchArray.length) currentMatchArray.push(['PLACEHOLDER WORD', [-1, -1], [-1, -1]]);
    if (mWord(i) != currentRecording[i] || firstIdx(i) == -1 || bestScore(i) < 0.7) {
      setWord(i, currentRecording[i]);
      const targetIdx = newPosition + i - speechPosition;
      firstIdx(i, -1); firstScore(i, -1); secondIdx(i, -1); secondScore(i, -1);
      for (let j = max(0, targetIdx - 3); j < min(recText.length, targetIdx + 9); j++) {
        const score = cmpScore(recText[j].word, currentRecording[i]);
        if (score > firstScore(i) || (score == firstScore(i) && Math.abs(j - targetIdx) < Math.abs(firstIdx(i) - targetIdx))) {
          secondScore(i, firstScore(i)); secondIdx(i, firstIdx(i));
          firstScore(i, score); firstIdx(i, j);
        }
      }
      let setnew = false, fIdx = firstIdx(i), fScore = firstScore(i);
      if (fIdx == -1) setnew = true;
      else if (Math.abs(fIdx - targetIdx) > 3 && fScore < 0.5) setnew = true;
      else if (Math.abs(fIdx - targetIdx) > 5 && fScore < 0.7) setnew = true;
      else if (Math.abs(fIdx - targetIdx) > 7 && fScore < 0.9) setnew = true;
      else if (Math.abs(fIdx - targetIdx) > 9 && fScore < 1) setnew = true;
      if (setnew) {
        firstScore(i, secondScore(i)); firstIdx(i, secondIdx(i));
        secondScore(i, -1); secondIdx(i, -1);
      }
      setnew = false; fIdx = firstIdx(i); fScore = firstScore(i);
      if (fIdx == -1) setnew = true;
      else if (Math.abs(fIdx - targetIdx) > 3 && fScore < 0.5) setnew = true;
      else if (Math.abs(fIdx - targetIdx) > 5 && fScore < 0.7) setnew = true;
      else if (Math.abs(fIdx - targetIdx) > 7 && fScore < 0.9) setnew = true;
      else if (Math.abs(fIdx - targetIdx) > 9 && fScore < 1) setnew = true;
      if (setnew) {
        firstIdx(i, max(0, min(targetIdx, recText.length - 1)));
        firstScore(i, cmpScore(recText[max(0, min(targetIdx, recText.length - 1))].word, currentRecording[i]));
      }
      maxScore = max(maxScore, firstScore(i));
    }
  }
  let idxMaxArr = [], idxMatchArr = [];
  for (let i = max(0, speechPosition - 10); i < currentRecording.length; i++) {
    if (firstIdx(i) >= 0 && firstScore(i) >= maxScore - 1e-6) {
      idxMaxArr.push(i); idxMatchArr.push(firstIdx(i));
    }
  }
  let lisequ = idxMatchArr.length > 0 ? lis(idxMatchArr).map(i => idxMaxArr[i]) : [];

  const recBestMatch = (leftBoundary, rightBoundary, lowerBound, upperBound, liseq) => {
    for (let maxIdx = 0; maxIdx <= liseq.length; maxIdx++) {
      let rangeStart = (maxIdx == 0) ? leftBoundary : liseq[maxIdx - 1] + 1;
      let rangeEnd = (maxIdx == liseq.length) ? rightBoundary : liseq[maxIdx];
      let lower = lowerBound, upper = upperBound;
      if (maxIdx > 0) lower = firstIdx(liseq[maxIdx - 1]);
      if (maxIdx < liseq.length) upper = firstIdx(liseq[maxIdx]);
      if (rangeEnd - rangeStart > 0) {
        maxScore = -1;
        for (let i = rangeStart; i < rangeEnd; i++) {
          if (firstIdx(i) <= lower || firstIdx(i) >= upper) {
            if (secondIdx(i) > lower && secondIdx(i) < upper) {
              firstScore(i, secondScore(i)); firstIdx(i, secondIdx(i));
              secondScore(i, -1); secondIdx(i, -1);
            } else if (upper - lower >= 2) {
              const interpolatedIdx = Math.floor(lower + (upper - lower - 1) * (i + 1 - rangeStart) / (rangeEnd - rangeStart));
              const newIdx = max(0, min(interpolatedIdx, recText.length - 1));
              if (recText[newIdx] !== undefined) {
                firstScore(i, cmpScore(currentRecording[i], recText[newIdx].word));
                firstIdx(i, newIdx);
                secondScore(i, -1);
                secondIdx(i, -1);
              } else {
                firstScore(i, -1);
                firstIdx(i, -1);
                secondScore(i, -1);
                secondIdx(i, -1);
              }
            } else {
              firstScore(i, -1); firstIdx(i, -1);
              secondScore(i, -1); secondIdx(i, -1);
            }
          }
          maxScore = max(maxScore, firstScore(i));
        }
        if (rangeEnd - rangeStart > 1 && maxScore >= 0) {
          idxMaxArr = []; idxMatchArr = [];
          for (let i = rangeStart; i < rangeEnd; i++) {
            if (firstScore(i) >= maxScore - 1e-6 && firstIdx(i) >= 0) {
              idxMaxArr.push(i); idxMatchArr.push(firstIdx(i));
            }
          }
          let lisequ2 = lis(idxMatchArr).map(i => idxMaxArr[i]);
          recBestMatch(rangeStart, rangeEnd, lower, upper, lisequ2);
        }
      }
    }
  };
  if (lisequ.length > 0) {
    const rightBoundary = min(
      recText.length,
      max(0, firstIdx(lisequ[lisequ.length - 1]))
      + min(1 + 2 * (currentRecording.length - lisequ[lisequ.length - 1] - 1), 6)
    );
    recBestMatch(
      max(0, speechPosition - 10),
      currentRecording.length,
      max(-1, firstIdx(lisequ[0]) - 6),
      rightBoundary,
      lisequ);
  }

  maxScore = -1; let maxPos = -1, foundPos = false;
  for (let i = currentRecording.length - 1; i >= max(0, currentRecording.length - 5); i--) {
    if (firstScore(i) >= 0.9) {
      speechPosition = i + 1; foundPos = true; break;
    } else if (firstScore(i) > maxScore) {
      maxScore = firstScore(i);
      maxPos = i + 1;
    }
  }
  if (!foundPos && maxPos >= 1) speechPosition = maxPos;
  if (speechPosition >= 1 && firstIdx(speechPosition - 1) >= 0) newPosition = firstIdx(speechPosition - 1) + 1;
  else if (speechPosition < currentRecording.length && firstIdx(speechPosition) >= 0) newPosition = firstIdx(speechPosition);

  if (newPosition < currentPosition && currentPosition - newPosition == 1) {
    newPosition = currentPosition;
    speechPosition++;
  } else if (newPosition < currentPosition && !hasStrongBacktrackEvidence(currentRecording, currentMatchArray, speechPosition, currentPosition, newPosition)) {
    newPosition = currentPosition;
  }
  let match = [[], []]; let lastUpperIdx = -1;
  for (let i = max(0, speechPosition - 10); i < currentRecording.length; i++) {
    if (firstIdx(i) == -1) {
      match[0].push(' ');
      match[1].push(currentRecording[i]);
    } else {
      while (lastUpperIdx >= 0 && lastUpperIdx + 1 < firstIdx(i)) {
        lastUpperIdx++;
        match[0].push(recText[lastUpperIdx].word);
        match[1].push(' ');
      }
      lastUpperIdx = firstIdx(i);
      match[0].push(recText[lastUpperIdx].word);
      match[1].push(currentRecording[i]);
    }
  }
  for (let j = lastUpperIdx + 1; j < min(lastUpperIdx + 6, recText.length); j++) {
    match[0].push(recText[j].word);
    match[1].push(' ');
  }
  while (currentMatchArray.length > currentRecording.length)
    currentMatchArray.pop();
  return [newPosition, speechPosition, currentMatchArray, match];
}

function getPreviewPosition(currentPosition, currentRecording, currentMatchArray) {
  let previewPosition = currentPosition;
  let expectedIdx = currentPosition;
  let lead = 0;
  const maxPreviewLead = 2;
  for (let i = max(0, currentRecording.length - 8); i < currentRecording.length; i++) {
    if (i >= currentMatchArray.length) continue;
    const matchIdx = currentMatchArray[i][1][0];
    const matchScore = currentMatchArray[i][1][1];
    if (matchIdx !== expectedIdx) continue;
    if (matchScore < 0.88 && !(lead === 0 && matchScore >= 0.94)) break;
    previewPosition = matchIdx + 1;
    expectedIdx = previewPosition;
    lead++;
    if (lead >= maxPreviewLead) break;
  }
  return previewPosition;
}

function getConfirmedPosition(recText, currentPosition, currentRecording, speechPosition, currentMatchArray) {
  const tuning = getMatchTuning();
  let pendingPosition = currentPosition;
  let confirmedPosition = currentPosition;
  let consecutiveMatches = 0;
  for (let i = 0; i < currentRecording.length && pendingPosition < recText.length; i++) {
    const spokenWord = currentRecording[i];
    const expectedWord = recText[pendingPosition] ? recText[pendingPosition].word : '';
    const matchScore = cmpScore(expectedWord, spokenWord);
    if (isSequentialWordMatch(expectedWord, spokenWord, matchScore, tuning)) {
      pendingPosition++;
      consecutiveMatches++;
      if (consecutiveMatches >= tuning.requiredSequentialMatches || isStrongSequentialWordMatch(expectedWord, spokenWord, matchScore, tuning))
        confirmedPosition = pendingPosition;
      continue;
    }
    if (pendingPosition + 1 < recText.length) {
      const skippedWord = recText[pendingPosition].word;
      const nextExpectedWord = recText[pendingPosition + 1].word;
      const nextMatchScore = cmpScore(nextExpectedWord, spokenWord);
      if (skippedWord.length <= tuning.skipShortWordLength && isSequentialWordMatch(nextExpectedWord, spokenWord, nextMatchScore, tuning)) {
        pendingPosition += 2;
        consecutiveMatches++;
        if (consecutiveMatches >= tuning.requiredSequentialMatches || isStrongSequentialWordMatch(nextExpectedWord, spokenWord, nextMatchScore, tuning))
          confirmedPosition = pendingPosition;
      }
    }
  }
  if (confirmedPosition === currentPosition && tuning.rejoinEnabled) {
    const rejoinPosition = findRejoinPosition(recText, currentPosition, currentRecording, currentMatchArray, tuning);
    if (rejoinPosition !== null)
      return rejoinPosition;
  }
  return confirmedPosition;
}

function findRejoinPosition(recText, currentPosition, currentRecording, currentMatchArray, tuning) {
  if (tuning.rejoinCooldown > 0 && getRecentRejoinCount(currentMatchArray, tuning.rejoinCooldown) > 0)
    return null;
  if (currentRecording.length < tuning.rejoinSequenceLength)
    return null;

  const speechStart = max(0, currentRecording.length - (tuning.rejoinLookaheadWindow + tuning.rejoinSequenceLength + tuning.rejoinMaxGapInSpeech + 8));
  const speechEnd = currentRecording.length;
  const promptStart = currentPosition + 1;
  const promptEnd = min(recText.length - tuning.rejoinSequenceLength, currentPosition + tuning.rejoinLookaheadWindow);
  let bestMatch = null;

  for (let promptIdx = promptStart; promptIdx <= promptEnd; promptIdx++) {
    for (let speechIdx = speechStart; speechIdx < speechEnd; speechIdx++) {
      const candidate = scoreRejoinSequence(recText, promptIdx, currentRecording, speechIdx, tuning);
      if (candidate === null)
        continue;
      if (bestMatch === null ||
          candidate.averageScore > bestMatch.averageScore + 1e-6 ||
          (Math.abs(candidate.promptEnd - currentPosition) < Math.abs(bestMatch.promptEnd - currentPosition))) {
        bestMatch = candidate;
      }
    }
  }

  if (bestMatch === null)
    return null;

  markRejoinUsage(currentMatchArray, bestMatch);
  return bestMatch.promptEnd;
}

function scoreRejoinSequence(recText, promptStartIdx, currentRecording, speechStartIdx, tuning) {
  let promptIdx = promptStartIdx;
  let speechIdx = speechStartIdx;
  let matchedWords = 0;
  let totalScore = 0;
  let gapBudget = tuning.rejoinMaxGapInSpeech;
  const matchedSpeechIndices = [];

  while (promptIdx < recText.length && speechIdx < currentRecording.length) {
    const expectedWord = recText[promptIdx].word;
    const spokenWord = currentRecording[speechIdx];
    const score = cmpScore(expectedWord, spokenWord);
    if (isSequentialWordMatch(expectedWord, spokenWord, score, tuning)) {
      totalScore += score;
      matchedWords++;
      matchedSpeechIndices.push(speechIdx);
      promptIdx++;
      speechIdx++;
      if (matchedWords >= tuning.rejoinSequenceLength)
        break;
      continue;
    }
    if (gapBudget <= 0)
      return null;
    gapBudget--;
    speechIdx++;
  }

  if (matchedWords < tuning.rejoinSequenceLength)
    return null;

  const averageScore = totalScore / matchedWords;
  if (averageScore < tuning.rejoinConfidenceThreshold / 100)
    return null;

  return {
    promptStart: promptStartIdx,
    promptEnd: promptIdx,
    averageScore,
    matchedWords,
    speechIndices: matchedSpeechIndices,
  };
}

function getRecentRejoinCount(currentMatchArray, cooldownWindow) {
  let rejoinCount = 0;
  const start = max(0, currentMatchArray.length - cooldownWindow);
  for (let i = start; i < currentMatchArray.length; i++) {
    if (currentMatchArray[i] && currentMatchArray[i][3] && currentMatchArray[i][3].rejoin === true)
      rejoinCount++;
  }
  return rejoinCount;
}

function markRejoinUsage(currentMatchArray, bestMatch) {
  for (let k = 0; k < bestMatch.speechIndices.length; k++) {
    const i = bestMatch.speechIndices[k];
    while (i >= currentMatchArray.length)
      currentMatchArray.push(['PLACEHOLDER WORD', [-1, -1], [-1, -1], null]);
    if (!Array.isArray(currentMatchArray[i]) || currentMatchArray[i].length < 4)
      currentMatchArray[i] = [currentMatchArray[i][0], currentMatchArray[i][1], currentMatchArray[i][2], null];
    currentMatchArray[i][3] = { rejoin: true };
  }
}

function isSequentialWordMatch(expectedWord, spokenWord, score, tuning) {
  if (expectedWord === spokenWord)
    return true;
  if (expectedWord.length <= 2)
    return score >= tuning.shortWordThreshold / 100;
  if (expectedWord.length <= 4)
    return score >= tuning.mediumWordThreshold / 100;
  return score >= tuning.longWordThreshold / 100;
}

function isStrongSequentialWordMatch(expectedWord, spokenWord, score, tuning) {
  return expectedWord === spokenWord || score >= tuning.strongMatchThreshold / 100 || expectedWord.length >= 8;
}

function getMatchTuning() {
  const defaults = {
    shortWordThreshold: 70,
    mediumWordThreshold: 78,
    longWordThreshold: 84,
    strongMatchThreshold: 96,
    skipShortWordLength: 3,
    requiredSequentialMatches: 2,
    rejoinEnabled: true,
    rejoinLookaheadWindow: 18,
    rejoinSequenceLength: 3,
    rejoinConfidenceThreshold: 82,
    rejoinMaxGapInSpeech: 2,
    rejoinCooldown: 1,
  };
  if (typeof window === 'undefined' || typeof window.prompterMatchTuning !== 'object' || window.prompterMatchTuning === null)
    return defaults;
  return {
    shortWordThreshold: window.prompterMatchTuning.shortWordThreshold || defaults.shortWordThreshold,
    mediumWordThreshold: window.prompterMatchTuning.mediumWordThreshold || defaults.mediumWordThreshold,
    longWordThreshold: window.prompterMatchTuning.longWordThreshold || defaults.longWordThreshold,
    strongMatchThreshold: window.prompterMatchTuning.strongMatchThreshold || defaults.strongMatchThreshold,
    skipShortWordLength: window.prompterMatchTuning.skipShortWordLength || defaults.skipShortWordLength,
    requiredSequentialMatches: window.prompterMatchTuning.requiredSequentialMatches || defaults.requiredSequentialMatches,
    rejoinEnabled: typeof window.prompterMatchTuning.rejoinEnabled === 'boolean' ? window.prompterMatchTuning.rejoinEnabled : defaults.rejoinEnabled,
    rejoinLookaheadWindow: window.prompterMatchTuning.rejoinLookaheadWindow || defaults.rejoinLookaheadWindow,
    rejoinSequenceLength: window.prompterMatchTuning.rejoinSequenceLength || defaults.rejoinSequenceLength,
    rejoinConfidenceThreshold: window.prompterMatchTuning.rejoinConfidenceThreshold || defaults.rejoinConfidenceThreshold,
    rejoinMaxGapInSpeech: window.prompterMatchTuning.rejoinMaxGapInSpeech || defaults.rejoinMaxGapInSpeech,
    rejoinCooldown: window.prompterMatchTuning.rejoinCooldown || defaults.rejoinCooldown,
  };
}

function hasStrongBacktrackEvidence(currentRecording, currentMatchArray, speechPosition, currentPosition, newPosition) {
  if (newPosition >= currentPosition)
    return true;
  let consecutive = 0;
  for (let i = max(0, speechPosition - 4); i < min(currentRecording.length, speechPosition + 1); i++) {
    if (i >= currentMatchArray.length)
      continue;
    const matchIdx = currentMatchArray[i][1][0];
    const matchScore = currentMatchArray[i][1][1];
    if (matchIdx >= newPosition && matchIdx < currentPosition && matchScore >= 0.92)
      consecutive++;
  }
  return consecutive >= 2;
}
