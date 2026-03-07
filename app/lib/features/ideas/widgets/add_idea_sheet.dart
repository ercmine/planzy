import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/theme/spacing.dart';
import '../../../core/contacts/phone_normalize.dart';
import '../../../models/idea.dart';
import '../../../models/session_filters.dart';
import '../../../providers/app_providers.dart';

class AddIdeaSheet extends ConsumerStatefulWidget {
  const AddIdeaSheet({required this.sessionId, super.key});

  final String sessionId;

  @override
  ConsumerState<AddIdeaSheet> createState() => _AddIdeaSheetState();
}

class _AddIdeaSheetState extends ConsumerState<AddIdeaSheet> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _websiteController = TextEditingController();
  final _phoneController = TextEditingController();

  Category? _selectedCategory;

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    _websiteController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(ideasControllerProvider(widget.sessionId));

    return Padding(
      padding: EdgeInsets.only(
        left: AppSpacing.m,
        right: AppSpacing.m,
        top: AppSpacing.m,
        bottom: MediaQuery.of(context).viewInsets.bottom + AppSpacing.m,
      ),
      child: Form(
        key: _formKey,
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('Add Idea', style: Theme.of(context).textTheme.titleLarge),
              const SizedBox(height: AppSpacing.m),
              TextFormField(
                controller: _titleController,
                maxLength: 140,
                textCapitalization: TextCapitalization.sentences,
                decoration: const InputDecoration(
                  labelText: 'Title *',
                  border: OutlineInputBorder(),
                ),
                validator: (value) {
                  final trimmed = value?.trim() ?? '';
                  if (trimmed.isEmpty) {
                    return 'Title is required';
                  }
                  if (trimmed.length > 140) {
                    return 'Title must be at most 140 characters';
                  }
                  return null;
                },
              ),
              const SizedBox(height: AppSpacing.s),
              TextFormField(
                controller: _descriptionController,
                maxLength: 400,
                maxLines: 3,
                textCapitalization: TextCapitalization.sentences,
                decoration: const InputDecoration(
                  labelText: 'Description',
                  border: OutlineInputBorder(),
                ),
                validator: (value) {
                  if ((value?.length ?? 0) > 400) {
                    return 'Description must be at most 400 characters';
                  }
                  return null;
                },
              ),
              const SizedBox(height: AppSpacing.s),
              DropdownButtonFormField<Category>(
                value: _selectedCategory,
                decoration: const InputDecoration(
                  labelText: 'Category',
                  border: OutlineInputBorder(),
                ),
                items: Category.values
                    .map(
                      (category) => DropdownMenuItem<Category>(
                        value: category,
                        child: Text(_readableCategory(category)),
                      ),
                    )
                    .toList(growable: false),
                onChanged: (value) => setState(() => _selectedCategory = value),
              ),
              const SizedBox(height: AppSpacing.s),
              TextFormField(
                controller: _websiteController,
                keyboardType: TextInputType.url,
                decoration: const InputDecoration(
                  labelText: 'Website (optional)',
                  hintText: 'https://example.com',
                  border: OutlineInputBorder(),
                ),
                validator: (value) {
                  final trimmed = value?.trim() ?? '';
                  if (trimmed.isEmpty) {
                    return null;
                  }
                  final uri = Uri.tryParse(trimmed);
                  if (uri == null || !uri.hasScheme || (uri.scheme != 'http' && uri.scheme != 'https')) {
                    return 'Website must start with http:// or https://';
                  }
                  return null;
                },
              ),
              const SizedBox(height: AppSpacing.s),
              TextFormField(
                controller: _phoneController,
                keyboardType: TextInputType.phone,
                inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[0-9+()\-\s]'))],
                decoration: const InputDecoration(
                  labelText: 'Phone (optional)',
                  hintText: '(555) 123-4567',
                  border: OutlineInputBorder(),
                ),
                validator: (value) {
                  final trimmed = value?.trim() ?? '';
                  if (trimmed.isEmpty) {
                    return null;
                  }
                  if (normalizePhoneToE164(trimmed) == null) {
                    return 'Enter a valid US phone number';
                  }
                  return null;
                },
              ),
              const SizedBox(height: AppSpacing.m),
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: state.isSubmitting ? null : _submit,
                  icon: state.isSubmitting
                      ? const SizedBox.square(
                          dimension: 16,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.add_circle_outline),
                  label: const Text('Add idea'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    final normalizedPhone = normalizePhoneToE164(_phoneController.text.trim());
    final request = CreateIdeaRequest(
      title: _titleController.text.trim(),
      description: _descriptionController.text.trim().isEmpty
          ? null
          : _descriptionController.text.trim(),
      category: _selectedCategory?.name,
      websiteLink: _websiteController.text.trim().isEmpty
          ? null
          : _websiteController.text.trim(),
      callLink: normalizedPhone == null ? null : 'tel:$normalizedPhone',
    );

    final success = await ref
        .read(ideasControllerProvider(widget.sessionId).notifier)
        .createIdea(request);

    if (!mounted) {
      return;
    }

    if (success) {
      Navigator.of(context).pop();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Idea added successfully')),
      );
    }
  }

  String _readableCategory(Category category) {
    final name = category.name;
    return '${name[0].toUpperCase()}${name.substring(1)}';
  }
}
