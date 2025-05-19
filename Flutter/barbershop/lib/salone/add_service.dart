import 'package:flutter/material.dart';
import '../global/style.dart';

class AddService extends StatelessWidget {
  final String title;
  final IconData icon;
  final int? prezzo;
  final int? durata;
  final VoidCallback? onTap;
  final VoidCallback? onEdit;
  final VoidCallback? onDelete;
  final Color iconColor;

  const AddService({
    super.key,
    required this.title,
    required this.icon,
    this.prezzo,
    this.durata,
    this.onTap,
    this.onEdit,
    this.onDelete,
    this.iconColor = AppColors.iconColor,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(
        vertical: AppDimens.cardMargin,
        horizontal: AppDimens.cardMargin,
      ),
      decoration: BoxDecoration(
        color: AppColors.cardBackground,
        borderRadius: const BorderRadius.only(
          topLeft: Radius.circular(AppDimens.cardRadiusTopLeft),
          topRight: Radius.circular(AppDimens.cardRadiusOther),
          bottomLeft: Radius.circular(AppDimens.cardRadiusOther),
          bottomRight: Radius.circular(AppDimens.cardRadiusOther),
        ),
        boxShadow: [
          BoxShadow(
            color: AppColors.cardShadow,
            blurRadius: AppDimens.cardShadowBlur,
            offset: Offset(0, AppDimens.cardShadowOffsetY),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(AppDimens.cardPadding),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Top row: title + buttons
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Title & Icon
                Padding(
                  padding: const EdgeInsets.only(left: AppDimens.iconTextPadding, top: AppDimens.iconTextPadding),
                  child: Row(
                    children: [
                      Icon(icon, color: iconColor, size: AppDimens.iconSize),
                      SizedBox(width: AppDimens.iconTextSpacing),
                      Text(
                        title,
                        style: TextStyle(
                          color: AppColors.titleText,
                          fontWeight: FontWeight.bold,
                          fontSize: AppDimens.titleTextSize,
                          letterSpacing: AppDimens.titleTextSpacing,
                        ),
                      ),
                    ],
                  ),
                ),
                const Spacer(),
                // Edit/Delete buttons
                Padding(
                  padding: const EdgeInsets.only(right: AppDimens.iconTextPadding, top: AppDimens.iconTextPadding),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      IconButton(
                        icon: Icon(Icons.edit, color: AppColors.buttonIcon, size: AppDimens.buttonIconSize),
                        onPressed: onEdit,
                        tooltip: "Modifica",
                      ),
                      IconButton(
                        icon: Icon(Icons.delete, color: AppColors.buttonIcon, size: AppDimens.buttonIconSize),
                        onPressed: onDelete,
                        tooltip: "Elimina",
                      ),
                    ],
                  ),
                ),
              ],
            ),
            SizedBox(height: AppDimens.infoRowSpacing),
            // Bottom row: prezzo & durata
            Row(
              children: [
                Padding(
                  padding: const EdgeInsets.only(left: AppDimens.iconTextPadding, bottom: AppDimens.infoTextPaddingBottom),
                  child: Text(
                    prezzo != null ? "€$prezzo" : "",
                    style: TextStyle(
                      color: AppColors.infoText,
                      fontSize: AppDimens.infoTextSize,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                SizedBox(width: AppDimens.infoRowSpacing),
                Padding(
                  padding: const EdgeInsets.only(bottom: AppDimens.infoTextPaddingBottom),
                  child: Text(
                    durata != null ? "$durata min" : "",
                    style: TextStyle(
                      color: AppColors.infoText,
                      fontSize: AppDimens.infoTextSize,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}