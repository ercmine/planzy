import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/theme/spacing.dart';
import '../ideas_controller.dart';
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

  Category? _category;

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
    final ideasState = ref.watch(ideasControllerProvider(widget.sessionId));
    final ideasController = ref.read(ideasControllerProvider(widget.sessionId).notifier);

    return SafeArea(
      child: Padding(
        padding: EdgeInsets.only(
          left: AppSpacing.m,
          right: AppSpacing.m,
          top: AppSpacing.m,
          bottom: MediaQuery.of(context).viewInsets.bottom + AppSpacing.m,
        ),
        child: SingleChildScrollView(
          child: Form(
            key: _formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text('Add Idea', style: Theme.of(context).textTheme.titleLarge),
                const SizedBox(height: AppSpacing.m),
                TextFormField(
                  controller: _titleController,
                  maxLength: 140,
                  decoration: const InputDecoration(labelText: 'Title'),
                  validator: (value) {
                    final text = value?.trim() ?? '';
                    if (text.isEmpty) {
                      return 'Title is required';
                    }
                    if (text.length > 140) {
                      return 'Title must be 140 characters or less';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: AppSpacing.s),
                TextFormField(
                  controller: _descriptionController,
                  maxLength: 400,
                  maxLines: 3,
                  decoration: const InputDecoration(labelText: 'Description (optional)'),
                  validator: (value) {
                    final text = value?.trim() ?? '';
                    if (text.length > 400) {
                      return 'Description must be 400 characters or less';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: AppSpacing.s),
                DropdownButtonFormField<Category?>(
                  value: _category,
                  decoration: const InputDecoration(labelText: 'Category (optional)'),
                  items: [
                    const DropdownMenuItem<Category?>(value: null, child: Text('None')),
                    ...Category.values.map(
                      (category) => DropdownMenuItem<Category?>(
                        value: category,
                        child: Text(_categoryLabel(category)),
                      ),
                    ),
                  ],
                  onChanged: (value) => setState(() => _category = value),
                ),
                const SizedBox(height: AppSpacing.s),
                TextFormField(
                  controller: _websiteController,
                  keyboardType: TextInputType.url,
                  decoration: const InputDecoration(labelText: 'Website (optional)'),
                  validator: _validateWebsite,
                ),
                const SizedBox(height: AppSpacing.s),
                TextFormField(
                  controller: _phoneController,
                  keyboardType: TextInputType.phone,
                  decoration: const InputDecoration(labelText: 'Phone (optional)'),
                  validator: _validatePhone,
                ),
                const SizedBox(height: AppSpacing.m),
                FilledButton.icon(
                  onPressed: ideasState.isSubmitting
                      ? null
                      : () => _onSubmit(context, ideasController),
                  icon: ideasState.isSubmitting
                      ? const SizedBox(
                          height: 16,
                          width: 16,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.add),
                  label: const Text('Submit idea'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _onSubmit(BuildContext context, IdeasController controller) async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    final normalizedPhone = normalizePhoneToE164(_phoneController.text.trim());

    final request = CreateIdeaRequest(
      title: _titleController.text.trim(),
      description: _trimToNull(_descriptionController.text),
      category: _category?.name,
      websiteLink: _trimToNull(_websiteController.text),
      callLink: normalizedPhone == null ? null : 'tel:$normalizedPhone',
    );

    final success = await controller.createIdea(request);
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

  String? _validateWebsite(String? value) {
    final text = value?.trim() ?? '';
    if (text.isEmpty) {
      return null;
    }

    final uri = Uri.tryParse(text);
    if (uri == null || !(uri.scheme == 'http' || uri.scheme == 'https')) {
      return 'Website must start with http:// or https://';
    }
    return null;
  }

  String? _validatePhone(String? value) {
    final text = value?.trim() ?? '';
    if (text.isEmpty) {
      return null;
    }

    if (normalizePhoneToE164(text) == null) {
      return 'Enter a valid US phone number';
    }
    return null;
  }

  String _categoryLabel(Category category) {
    final raw = category.name;
    return '${raw[0].toUpperCase()}${raw.substring(1)}';
  }

  String? _trimToNull(String value) {
    final trimmed = value.trim();
    return trimmed.isEmpty ? null : trimmed;
  }
}
