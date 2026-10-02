import 'package:flutter/material.dart';
import 'registrati.dart';

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();
  final GlobalKey<FormState> _formKey = GlobalKey<FormState>();
 

  String? _errorMessage;
  bool _isLoading = false;

  Future<void> _fetchUser() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });
    await Future.delayed(const Duration(seconds: 1)); // Simula attesa
    final email = _emailController.text.trim();
    final password = _passwordController.text.trim();
    if (email == 'admin' && password == '123456') {
      // TODO: naviga alla home o salva stato login
      debugPrint("Login success (mock)");
    } else {
      setState(() {
        _errorMessage = 'Credenziali non valide';
      });
    }
    setState(() {
      _isLoading = false;
    });
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
              // HEADER
              Expanded(
                flex: 3,
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: const [
                    Icon(Icons.spa, size: 80, color: Colors.black87),
                    SizedBox(height: 20),
                    Text(
                      'Benvenuto su Barbshop',
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
                        'Prenota il tuo servizio di bellezza in modo semplice e veloce',
                        textAlign: TextAlign.center,
                        style: TextStyle(fontSize: 18, color: Colors.black54),
                      ),
                    ),
                  ],
                ),
              ),

              // CARD FORM
              Expanded(
                flex: 4,
                child: Container(
                  margin: const EdgeInsets.symmetric(
                    horizontal: 24,
                    vertical: 16,
                  ),
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
                  child: Form(
                    key: _formKey,
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        // Email
                        TextFormField(
                          controller: _emailController,
                          // validator: (v) {
                          //   if (v == null) return 'Email non valida';
                          //   final atIndex = v.indexOf('@');
                          //   final dotIndex = v.indexOf('.', atIndex + 1);
                          //   return (atIndex > 0 && dotIndex > atIndex)
                          //       ? null
                          //       : 'Email non valida';
                          // },
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
                              horizontal: 16,
                              vertical: 16,
                            ),
                          ),
                        ),
                        const SizedBox(height: 18),

                        // Password
                        TextFormField(
                          controller: _passwordController,
                          obscureText: true,
                          validator:
                              (v) =>
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
                              horizontal: 16,
                              vertical: 16,
                            ),
                          ),
                        ),
                        const SizedBox(height: 18),

                        // Errore di login
                        if (_errorMessage != null)
                          Padding(
                            padding: const EdgeInsets.only(bottom: 12),
                            child: Text(
                              _errorMessage!,
                              style: const TextStyle(
                                color: Colors.red,
                                fontSize: 16,
                              ),
                              textAlign: TextAlign.center,
                            ),
                          ),

                        // Pulsante Accedi
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton(
                            onPressed: _isLoading ? null : _fetchUser,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.black87,
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(vertical: 18),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                            ),
                            child:
                                _isLoading
                                    ? const SizedBox(
                                      height: 24,
                                      width: 24,
                                      child: CircularProgressIndicator(
                                        color: Colors.white,
                                        strokeWidth: 2,
                                      ),
                                    )
                                    : const Text(
                                      'Accedi',
                                      style: TextStyle(
                                        fontWeight: FontWeight.bold,
                                        fontSize: 18,
                                      ),
                                    ),
                          ),
                        ),
                        const SizedBox(height: 20),

                        // Password dimenticata?
                        TextButton(
                          onPressed: () {
                            // TODO: implementa reset password
                          },
                          child: const Text(
                            'Password dimenticata?',
                            style: TextStyle(
                              color: Colors.black54,
                              fontSize: 18,
                            ),
                          ),
                        ),

                        const SizedBox(height: 20),
                        const Divider(color: Colors.grey),
                        const SizedBox(height: 20),

                        // Non sei registrato? Registrati
                        GestureDetector(
                          onTap: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (context) => const RegisterPage(),
                              ),
                            );
                          },
                          child: RichText(
                            textAlign: TextAlign.center,
                            text: TextSpan(
                              text: 'Non sei registrato? ',
                              style: const TextStyle(
                                color: Colors.black54,
                                fontSize: 18,
                              ),
                              children: const [
                                TextSpan(
                                  text: 'Registrati',
                                  style: TextStyle(
                                    color: Colors.black87,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 20,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
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
