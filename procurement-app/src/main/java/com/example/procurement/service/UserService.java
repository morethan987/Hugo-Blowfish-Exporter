package com.example.procurement.service;

import com.example.procurement.model.Role;
import com.example.procurement.model.User;
import com.example.procurement.repository.RoleRepository;
import com.example.procurement.repository.UserRepository;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.core.userdetails.User.UserBuilder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class UserService implements UserDetailsService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    public UserService(UserRepository userRepository, RoleRepository roleRepository,
                       PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public void registerUser(User user) {
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        Role userRole = roleRepository.findById("ROLE_USER")
                .orElseGet(() -> roleRepository.save(new Role("ROLE_USER")));
        user.getRoles().add(userRole);
        userRepository.save(user);
    }

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
        UserBuilder builder = org.springframework.security.core.userdetails.User.withUsername(username)
                .password(user.getPassword())
                .roles(user.getRoles().stream().map(r -> r.getName().substring(5)).toArray(String[]::new));
        return builder.build();
    }
}
