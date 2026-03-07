import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

class TimeWindowPicker extends StatelessWidget {
  const TimeWindowPicker({
    required this.enabled,
    required this.start,
    required this.end,
    required this.onEnabledChanged,
    required this.onChanged,
    super.key,
  });

  final bool enabled;
  final DateTime? start;
  final DateTime? end;
  final ValueChanged<bool> onEnabledChanged;
  final void Function(DateTime start, DateTime end) onChanged;

  @override
  Widget build(BuildContext context) {
    final text = (start != null && end != null)
        ? '${DateFormat.yMMMd().add_jm().format(start!)} - ${DateFormat.yMMMd().add_jm().format(end!)}'
        : 'No time selected';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SwitchListTile(
          contentPadding: EdgeInsets.zero,
          value: enabled,
          title: const Text('Set time window'),
          onChanged: onEnabledChanged,
        ),
        if (enabled)
          OutlinedButton.icon(
            onPressed: () => _pick(context),
            icon: const Icon(Icons.schedule),
            label: Text(text),
          ),
      ],
    );
  }

  Future<void> _pick(BuildContext context) async {
    final now = DateTime.now();
    final date = await showDatePicker(
      context: context,
      firstDate: now,
      initialDate: start ?? now,
      lastDate: now.add(const Duration(days: 365)),
    );
    if (date == null || !context.mounted) {
      return;
    }
    final startTime = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(start ?? now),
    );
    if (startTime == null || !context.mounted) {
      return;
    }
    final endTime = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime((end ?? now).add(const Duration(hours: 2))),
    );
    if (endTime == null) {
      return;
    }

    final startDateTime = DateTime(
      date.year,
      date.month,
      date.day,
      startTime.hour,
      startTime.minute,
    );
    final endDateTime = DateTime(
      date.year,
      date.month,
      date.day,
      endTime.hour,
      endTime.minute,
    );

    onChanged(
      startDateTime,
      endDateTime.isAfter(startDateTime)
          ? endDateTime
          : startDateTime.add(const Duration(hours: 1)),
    );
  }
}
