import 'package:flutter/material.dart';

enum UserRole { cliente, professionista }

class RegisterPage extends StatefulWidget {
  const RegisterPage({super.key});

  @override
  State<RegisterPage> createState() => _RegisterPageState();
}

class _RegisterPageState extends State<RegisterPage> {
  UserRole? _role;
  final _formKey = GlobalKey<FormState>();
  final _nameCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  bool _isLoading = false;

  Future<void> _submit() async {
    if (_role == null || !_formKey.currentState!.validate()) return;
    setState(() => _isLoading = true);
    await Future.delayed(const Duration(seconds: 1));
    // TODO: invia registrazione al server
    setState(() => _isLoading = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Color(0xFFEFEFEF), Color(0xFFF4F4F5)],
          ),
        ),
        child: SafeArea(
          child: Column(
            children: [
              // --- HEADER ---
              Expanded(
                flex: 3,
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: const [
                    Icon(Icons.app_registration, size: 80, color: Colors.black87),
                    SizedBox(height: 20),
                    Text(
                      'Registrati su Barbshop',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 30,
                        fontWeight: FontWeight.bold,
                        color: Colors.black87,
                      ),
                    ),
                    SizedBox(height: 12),
                    Padding(
                      padding: EdgeInsets.symmetric(horizontal: 32),
                      child: Text(
                        'Scegli il tuo ruolo e completa la registrazione',
                        textAlign: TextAlign.center,
                        style: TextStyle(fontSize: 18, color: Colors.black54),
                      ),
                    ),
                  ],
                ),
              ),

              // --- CARD FORM ---
              Expanded(
                flex: 4,
                child: Align(
                  alignment: Alignment.topCenter,
                  child: Container(
                    margin: const EdgeInsets.fromLTRB(24, 16, 24, 0),
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      boxShadow: const [
                        BoxShadow(
                          color: Colors.black12,
                          blurRadius: 6,
                          offset: Offset(0, 3),
                        ),
                      ],
                    ),
                    child: SingleChildScrollView(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          // ROLE TOGGLE
                          ToggleButtons(
                            isSelected: [
                              _role == UserRole.cliente,
                              _role == UserRole.professionista
                            ],
                            borderRadius: BorderRadius.circular(8),
                            selectedColor: Colors.white,
                            fillColor: Colors.black87,
                            color: Colors.black87,
                            constraints: const BoxConstraints(minHeight: 40),
                            onPressed: (i) {
                              setState(() {
                                _role = UserRole.values[i];
                              });
                            },
                            children: const [
                              Padding(
                                padding: EdgeInsets.symmetric(horizontal: 16),
                                child: Text('Cliente', style: TextStyle(fontSize: 16)),
                              ),
                              Padding(
                                padding: EdgeInsets.symmetric(horizontal: 16),
                                child: Text('Professionista', style: TextStyle(fontSize: 16)),
                              ),
                            ],
                          ),

                          const SizedBox(height: 24),

                          Form(
                            key: _formKey,
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                // Nome
                                TextFormField(
                                  controller: _nameCtrl,
                                  validator: (v) =>
                                      v != null && v.trim().length >= 2
                                          ? null
                                          : 'Inserisci il nome',
                                  decoration: InputDecoration(
                                    hintText: 'Nome e Cognome',
                                    hintStyle: const TextStyle(fontSize: 16),
                                    filled: true,
                                    fillColor: Colors.white,
                                    border: OutlineInputBorder(
                                      borderRadius: BorderRadius.circular(12),
                                      borderSide: BorderSide.none,
                                    ),
                                    contentPadding: const EdgeInsets.symmetric(
                                        horizontal: 16, vertical: 16),
                                  ),
                                ),
                                const SizedBox(height: 16),

                                // Email
                                TextFormField(
                                  controller: _emailCtrl,
                                  validator: (v) {
                                    if (v == null) return 'Email non valida';
                                    final at = v.indexOf('@');
                                    final dot = v.indexOf('.', at + 1);
                                    return (at > 0 && dot > at)
                                        ? null
                                        : 'Email non valida';
                                  },
                                  decoration: InputDecoration(
                                    hintText: 'Email',
                                    hintStyle: const TextStyle(fontSize: 16),
                                    filled: true,
                                    fillColor: Colors.white,
                                    border: OutlineInputBorder(
                                      borderRadius: BorderRadius.circular(12),
                                      borderSide: BorderSide.none,
                                    ),
                                    contentPadding: const EdgeInsets.symmetric(
                                        horizontal: 16, vertical: 16),
                                  ),
                                ),
                                const SizedBox(height: 16),

                                // Password
                                TextFormField(
                                  controller: _passCtrl,
                                  obscureText: true,
                                  validator: (v) =>
                                      v != null && v.length >= 6
                                          ? null
                                          : 'Minimo 6 caratteri',
                                  decoration: InputDecoration(
                                    hintText: 'Password',
                                    hintStyle: const TextStyle(fontSize: 16),
                                    filled: true,
                                    fillColor: Colors.white,
                                    border: OutlineInputBorder(
                                      borderRadius: BorderRadius.circular(12),
                                      borderSide: BorderSide.none,
                                    ),
                                    contentPadding: const EdgeInsets.symmetric(
                                        horizontal: 16, vertical: 16),
                                  ),
                                ),
                                const SizedBox(height: 24),

                                // Pulsante Registrati
                                SizedBox(
                                  height: 50,
                                  child: ElevatedButton(
                                    onPressed: _isLoading ? null : _submit,
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: Colors.black87,
                                      shape: RoundedRectangleBorder(
                                          borderRadius: BorderRadius.circular(12)),
                                    ),
                                    child: _isLoading
                                        ? const SizedBox(
                                            width: 24,
                                            height: 24,
                                            child: CircularProgressIndicator(
                                              color: Colors.white,
                                              strokeWidth: 2,
                                            ),
                                          )
                                        : const Text(
                                            'Registrati',
                                            style: TextStyle(
                                              fontSize: 18,
                                              fontWeight: FontWeight.bold,
                                            ),
                                          ),
                                  ),
                                ),

                                const SizedBox(height: 16),

                                // Torna al login
                                Center(
                                  child: TextButton(
                                    onPressed: () => Navigator.pop(context),
                                    child: const Text(
                                      'Ho già un account, accedi',
                                      style: TextStyle(
                                        color: Colors.black54,
                                        fontSize: 16,
                                      ),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}