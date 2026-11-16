import 'dart:convert';
import 'dart:math';
import 'android_audio.dart';

enum LearningTask { direction, neighbour, pattern }

extension LearningTaskText on LearningTask {
  String get title => const [
    'Repeat or move',
    'Find the neighbour',
    'Read a tiny pattern',
  ][index];
  String get objective => const [
    'Hear two notes. Decide whether the second repeats, goes up, or goes down.',
    'Hear a starting note, then find the neighbouring written note. Hear the target whenever you need help.',
    'Use a starting note to read a three-note pattern, one pitch at a time. There is no rhythm or speed score.',
  ][index];
}

class LearningPrompt {
  const LearningPrompt(this.anchor, this.target, {this.pattern, this.step});
  final int anchor, target;
  final String? pattern;
  final int? step;
  String get direction => target == anchor
      ? 'Repeat'
      : target > anchor
      ? 'Up'
      : 'Down';
  String get key => '$anchor:$target:${pattern ?? ''}:${step ?? ''}';
}

const directionPool = [
  LearningPrompt(60, 60),
  LearningPrompt(62, 62),
  LearningPrompt(64, 64),
  LearningPrompt(60, 62),
  LearningPrompt(62, 60),
  LearningPrompt(62, 64),
  LearningPrompt(64, 62),
];
const neighbourPool = [
  LearningPrompt(60, 62),
  LearningPrompt(62, 60),
  LearningPrompt(62, 64),
  LearningPrompt(64, 62),
];
const patternPool = [
  [60, 62, 60],
  [64, 62, 64],
  [62, 60, 62],
  [62, 64, 62],
];
String learningNoteName(int midi) =>
    '${{0: 'C', 2: 'D', 4: 'E'}[midi % 12]}${midi ~/ 12 - 1}';
List<LearningPrompt> learningPrompts(LearningTask task, Random random) {
  if (task != LearningTask.pattern) {
    return [...(task == LearningTask.direction ? directionPool : neighbourPool)]
      ..shuffle(random);
  }
  final patterns = [...patternPool]..shuffle(random);
  return [
    for (final notes in patterns)
      for (var i = 1; i < 3; i++)
        LearningPrompt(
          notes[i - 1],
          notes[i],
          pattern: notes.map(learningNoteName).join(' → '),
          step: i,
        ),
  ];
}

class LearningAttempt {
  LearningAttempt(this.prompt);
  final LearningPrompt prompt;
  String? firstResponse;
  bool completed = false,
      skipped = false,
      anchorRequested = false,
      targetRequested = false,
      hintRequested = false;
  bool get resolved => completed || skipped;
  Map<String, dynamic> toJson() => {
    'anchor': prompt.anchor,
    'target': prompt.target,
    'pattern': prompt.pattern,
    'step': prompt.step,
    'firstResponse': firstResponse,
    'completed': completed,
    'skipped': skipped,
    'anchorRequested': anchorRequested,
    'targetRequested': targetRequested,
    'hintRequested': hintRequested,
  };
}

class LearningSession {
  LearningSession({
    required this.task,
    required this.input,
    this.voiceOffset = 0,
    this.manualPacing = true,
    this.setupPreview = false,
    this.review = false,
    Random? random,
  }) : id = List.generate(
         16,
         (_) => Random.secure().nextInt(256).toRadixString(16).padLeft(2, '0'),
       ).join(),
       prompts = learningPrompts(task, random ?? Random());
  final String id;
  final LearningTask task;
  final String input;
  final int voiceOffset;
  final bool manualPacing, setupPreview, review;
  final List<LearningPrompt> prompts;
  final List<LearningAttempt> attempts = [];
  bool teachingRequested = false, supportedPractice = false;
  int? completedAt;
  LearningAttempt? _current;
  LearningAttempt get current =>
      _current ??= LearningAttempt(prompts[attempts.length]);
  bool get finished => attempts.length == prompts.length;
  bool answer(String value) {
    if (finished || current.resolved) return false;
    if (task == LearningTask.direction &&
        !['Repeat', 'Up', 'Down'].contains(value)) {
      return false;
    }
    if (task != LearningTask.direction && value != 'matched') return false;
    current.firstResponse ??= value;
    final correct =
        task != LearningTask.direction || value == current.prompt.direction;
    if (correct) current.completed = true;
    return correct;
  }

  void skip() {
    if (!finished && !current.resolved) current.skipped = true;
  }

  void next(DateTime now) {
    if (finished || !current.resolved) return;
    attempts.add(current);
    _current = null;
    if (finished) completedAt = now.toUtc().millisecondsSinceEpoch;
  }

  Map<String, dynamic> toJson() {
    if (!finished) throw StateError('Partial sessions are not history');
    return {
      'id': id,
      'task': task.name,
      'version': 1,
      'input': input,
      'clef': 'treble',
      'pool': 'cde',
      'voiceOffset': voiceOffset,
      'manualPacing': manualPacing,
      'setupPreview': setupPreview,
      'review': review,
      'teachingRequested': teachingRequested,
      'supportedPractice': supportedPractice,
      'completedAt': completedAt,
      'attempts': attempts.map((a) => a.toJson()).toList(),
    };
  }
}

class LearningRecord {
  LearningRecord._(this.data);
  final Map<String, dynamic> data;
  String get id => data['id'] as String;
  LearningTask get task => LearningTask.values.byName(data['task'] as String);
  String get input => data['input'] as String;
  int? get date => data['completedAt'] as int?;
  bool get review => data['review'] as bool;
  List<Map<String, dynamic>> get attempts =>
      (data['attempts'] as List).cast<Map<String, dynamic>>();
  int get matched => attempts.where((a) => a['completed'] == true).length;
  int get skipped => attempts.where((a) => a['skipped'] == true).length;
  int get helped => attempts
      .where((a) => a['targetRequested'] == true || a['hintRequested'] == true)
      .length;
  int get firstCorrect => attempts.where((a) {
    final direction = a['anchor'] == a['target']
        ? 'Repeat'
        : (a['target'] as int) > (a['anchor'] as int)
        ? 'Up'
        : 'Down';
    return a['completed'] == true &&
        a['firstResponse'] ==
            (task == LearningTask.direction ? direction : 'matched') &&
        a['targetRequested'] == false &&
        a['hintRequested'] == false;
  }).length;
  String get summary => task == LearningTask.direction
      ? '$firstCorrect/${attempts.length} first direction choices without hints · $matched completed · $helped hints · $skipped skipped'
      : '$matched/${attempts.length} pitch steps matched · $helped target requests · $skipped skipped';
  String get context => [
    if (input == 'voice')
      'Voice references: ${learningNoteName(60 + (data['voiceOffset'] as int))}–${learningNoteName(64 + (data['voiceOffset'] as int))}.',
    if (data['supportedPractice'] == true)
      'Supported practice was used before this check.',
    if (data['teachingRequested'] == true)
      'Teaching sounds were requested before this check.',
    if (data['setupPreview'] == true) 'A voice pitch preview was requested.',
    'Starting references are allowed. This is one session, not a mastery score.',
  ].join(' ');
  bool comparable(LearningRecord other) =>
      task == other.task &&
      input == other.input &&
      [
        'voiceOffset',
        'manualPacing',
        'setupPreview',
        'teachingRequested',
        'supportedPractice',
      ].every((k) => data[k] == other.data[k]);

  static LearningRecord parse(Object? value) {
    if (value is! Map<String, dynamic>) {
      throw const FormatException('Invalid session');
    }
    final d = Map<String, dynamic>.from(value);
    d.putIfAbsent('supportedPractice', () => false);
    if (d['id'] is! String ||
        !RegExp(r'^[0-9a-f]{32}$').hasMatch(d['id'] as String) ||
        d['version'] != 1 ||
        d['clef'] != 'treble' ||
        d['pool'] != 'cde' ||
        !LearningTask.values.any((t) => t.name == d['task']) ||
        !['listening', 'voice', 'instrument'].contains(d['input']) ||
        ![-12, 0, 12].contains(d['voiceOffset']) ||
        [
          'manualPacing',
          'setupPreview',
          'review',
          'teachingRequested',
          'supportedPractice',
        ].any((k) => d[k] is! bool) ||
        (d['completedAt'] != null &&
            (d['completedAt'] is! int || (d['completedAt'] as int) < 0))) {
      throw const FormatException('Unsupported learning session');
    }
    final task = LearningTask.values.byName(d['task'] as String);
    if ((task == LearningTask.direction) != (d['input'] == 'listening') ||
        (d['input'] != 'voice' &&
            (d['voiceOffset'] != 0 || d['setupPreview'] == true))) {
      throw const FormatException('Incompatible input');
    }
    final expected = learningPrompts(task, Random(0)).map((p) => p.key).toSet();
    final raw = d['attempts'];
    if (raw is! List || raw.length != expected.length) {
      throw const FormatException('Incomplete session');
    }
    final seen = <String>{};
    for (final a in raw) {
      if (a is! Map<String, dynamic> ||
          a['anchor'] is! int ||
          a['target'] is! int ||
          [
            'completed',
            'skipped',
            'anchorRequested',
            'targetRequested',
            'hintRequested',
          ].any((k) => a[k] is! bool) ||
          a['completed'] == a['skipped']) {
        throw const FormatException('Invalid attempt');
      }
      final key =
          '${a['anchor']}:${a['target']}:${a['pattern'] ?? ''}:${a['step'] ?? ''}';
      if (!expected.contains(key) || !seen.add(key)) {
        throw const FormatException('Invalid pool');
      }
      if (a['firstResponse'] != null &&
          !(task == LearningTask.direction
                  ? ['Repeat', 'Up', 'Down']
                  : ['matched'])
              .contains(a['firstResponse'])) {
        throw const FormatException('Invalid response');
      }
      if (a['completed'] == true &&
          (a['firstResponse'] == null || a['anchorRequested'] != true)) {
        throw const FormatException('Missing response or reference');
      }
      if (task == LearningTask.direction && a['targetRequested'] == true) {
        throw const FormatException('Direction help uses hints');
      }
      if (task != LearningTask.direction &&
          (a['hintRequested'] == true ||
              (a['skipped'] == true && a['firstResponse'] != null))) {
        throw const FormatException('Invalid sound outcome');
      }
    }
    if (task == LearningTask.pattern) {
      for (var i = 0; i < raw.length; i += 2) {
        if (raw[i]['step'] != 1 ||
            raw[i + 1]['step'] != 2 ||
            raw[i]['pattern'] != raw[i + 1]['pattern'] ||
            raw[i]['target'] != raw[i + 1]['anchor']) {
          throw const FormatException('Invalid pattern sequence');
        }
      }
    }
    return LearningRecord._(d);
  }
}

class LearningHistory {
  LearningHistory(this.storage);
  final AudioBridge storage;
  static const key = 'learning.v2.sessions';
  static const limit = 60;
  static final _writes = Expando<Future<void>>();
  Future<List<LearningRecord>> load() async {
    final raw = await storage.readProgress(key);
    if (raw == null) return [];
    if (raw.length > 500000) throw const FormatException('History too large');
    final value = jsonDecode(raw);
    if (value is! Map ||
        value['schema'] != 1 ||
        value['sessions'] is! List ||
        (value['sessions'] as List).length > limit) {
      throw const FormatException('History unavailable; stored data preserved');
    }
    final records = (value['sessions'] as List)
        .map(LearningRecord.parse)
        .toList();
    if (records.map((r) => r.id).toSet().length != records.length) {
      throw const FormatException('Duplicate sessions');
    }
    return records;
  }

  Future<void> save(LearningSession session) {
    final record = LearningRecord.parse(session.toJson());
    final operation = (_writes[storage] ?? Future<void>.value()).then((
      _,
    ) async {
      final records = await load();
      final index = records.indexWhere((r) => r.id == record.id);
      if (index >= 0) {
        records[index] = record;
      } else {
        records.add(record);
      }
      final kept = records
          .skip(max(0, records.length - limit))
          .map((r) => r.data)
          .toList();
      await storage.writeProgress(
        key,
        jsonEncode({'schema': 1, 'sessions': kept}),
      );
    });
    _writes[storage] = operation.catchError((Object _) {});
    return operation;
  }
}

String reviewInvitation(
  List<LearningRecord> records,
  LearningRecord last,
  DateTime now,
) {
  final stamp = last.date;
  final current = now.toUtc().millisecondsSinceEpoch;
  if (stamp == null || stamp > current) {
    return 'Repeat when ready. The saved date cannot establish when review is due.';
  }
  final comparable = records
      .where(
        (r) =>
            r.comparable(last) &&
            r.review &&
            r.data['supportedPractice'] == false &&
            r.data['teachingRequested'] == false &&
            r.data['setupPreview'] == false &&
            r.firstCorrect == r.attempts.length &&
            r.helped == 0 &&
            r.date != null &&
            r.date! <= current,
      )
      .toList();
  final distinct = <int>[];
  for (final r in comparable) {
    if (distinct.isEmpty || r.date! - distinct.last >= 86400000) {
      distinct.add(r.date!);
    }
  }
  final days = distinct.isEmpty
      ? 1
      : distinct.length == 1
      ? 3
      : 7;
  if (current - stamp >= days * 86400000) {
    return 'Try a return check before replaying teaching. At least $days elapsed days since this session.';
  }
  return 'Repeat whenever you like. Suggested return check after $days elapsed days; no streak or unlock requirement.';
}
